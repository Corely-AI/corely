import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  AddOperationalRequestAttachmentSchema,
  ApprovalPolicyStepSchema,
  ConfigureOperationalRequestRouteSchema,
  OperationalRequestDraftSchema,
  OperationalRequestKindSchema,
  OperationalRequestListQuerySchema,
  OperationalRequestRoutingMissingCode,
  OperationalRequestVersionSchema,
  SubmitOperationalRequestDraftSchema,
  UpdateOperationalRequestSchema,
  type AddOperationalRequestAttachment,
  type OperationalRequest,
  type OperationalRequestDraft,
  type OperationalRequestsPage,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  isOk,
  type AuditPort,
  type OutboxPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import { z } from "zod";
import { ApprovalPolicyService } from "../../approvals/public";
import {
  DocumentsApplication,
  OPERATIONAL_REQUEST_DOCUMENT_PREFIX,
  OperationalRequestDocuments,
} from "../../documents/public";
import { GetWorkspacePermissionsUseCase } from "../../identity/public";
import { StaffOperationsLookup } from "../../people/public";
import { TenantEntitlementService } from "../../platform/public";
import { OperationalRequestRepository, type RequestScope } from "./ports/request-repository.port";
import type { OperationalRequestRecord } from "./request-record";

const PAGE_SIZE = 25;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const approvalSpec = z.object({
  meta: z.object({ policy: z.object({ steps: z.tuple([ApprovalPolicyStepSchema]) }) }),
});
const idKeySchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[\w-]+$/);

type Command =
  | { kind: "create"; draft: OperationalRequestDraft }
  | { kind: "update"; id: string; version: number; draft: OperationalRequestDraft }
  | { kind: "submit" | "withdraw"; id: string; version: number }
  | { kind: "attach"; id: string; input: AddOperationalRequestAttachment };

@Injectable()
export class OperationalRequestsUseCase {
  constructor(
    private readonly repo: OperationalRequestRepository,
    private readonly permissions: GetWorkspacePermissionsUseCase,
    private readonly entitlements: TenantEntitlementService,
    private readonly staff: StaffOperationsLookup,
    private readonly approvals: ApprovalPolicyService,
    private readonly attachments: OperationalRequestDocuments,
    private readonly documents: DocumentsApplication,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  async list(query: unknown, ctx: UseCaseContext): Promise<OperationalRequestsPage> {
    const auth = await this.authorize(ctx);
    const { page } = OperationalRequestListQuerySchema.parse(query);
    const records = await this.repo.list(auth.scope, auth.userId);
    records.sort(
      (first, second) =>
        second.updatedAt.localeCompare(first.updatedAt) || first.id.localeCompare(second.id)
    );
    return {
      items: records
        .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        .map(({ id, kind, status, updatedAt }) => ({ id, kind, status, updatedAt })),
      hasMore: records.length > page * PAGE_SIZE,
      canSubmit: auth.can("requests.own.submit"),
      canManageRouting: auth.can("requests.routing.manage"),
    };
  }

  async detail(id: string, ctx: UseCaseContext) {
    const auth = await this.authorize(ctx);
    return this.project(
      await this.requireOwnedRecord(auth.scope, auth.userId, id),
      ctx,
      auth.can("documents.read")
    );
  }

  async canRead(id: string, ctx: UseCaseContext): Promise<boolean> {
    try {
      const auth = await this.authorize(ctx);
      await this.requireOwnedRecord(auth.scope, auth.userId, id);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) {
        return false;
      }
      throw error;
    }
  }

  async routes(ctx: UseCaseContext) {
    const auth = await this.authorize(ctx);
    if (!auth.can("requests.routing.manage")) {
      throw new ForbiddenException("Request routing management required");
    }
    return Promise.all(
      OperationalRequestKindSchema.options.map(async (kind) => {
        const policyId = await this.repo.route(auth.scope, kind);
        return {
          kind,
          reviewerUserId: policyId ? await this.reviewerForPolicy(auth.scope, policyId) : null,
        };
      })
    );
  }

  configureRoute(kind: unknown, raw: unknown, key: string | undefined, ctx: UseCaseContext) {
    return this.writeRoute(
      OperationalRequestKindSchema.parse(kind),
      ConfigureOperationalRequestRouteSchema.parse(raw).reviewerUserId,
      idKeySchema.parse(key),
      ctx
    );
  }

  private async writeRoute(
    kind: z.infer<typeof OperationalRequestKindSchema>,
    reviewerUserId: string,
    key: string,
    ctx: UseCaseContext
  ) {
    const initial = await this.authorize(ctx);
    return this.repo.transaction(initial.scope, async (tx) => {
      const auth = await this.authorize(ctx, tx);
      if (!auth.can("requests.routing.manage")) {
        throw new ForbiddenException("Request routing management required");
      }
      const commandKey = digest([auth.userId, key]);
      const fingerprint = digest([kind, reviewerUserId]);
      const replay = await this.repo.routeReplay(auth.scope, commandKey, tx);
      if (replay) {
        if (fingerprint !== replay.fingerprint) {
          throw new ConflictException(
            "The idempotency key is already used for another routing change"
          );
        }
        return replay.route;
      }
      const route = { kind, reviewerUserId };
      if (!(await this.canReview(auth.scope, reviewerUserId, tx))) {
        throw new BadRequestException(
          "The reviewer must have request review permission in the workspace"
        );
      }
      const current = await this.repo.route(auth.scope, kind, tx);
      if (current && (await this.reviewerForPolicy(auth.scope, current, tx)) === reviewerUserId) {
        await this.repo.saveRouteReplay(auth.scope, commandKey, { fingerprint, route }, tx);
        return route;
      }
      const policy = await this.approvals.createOperationalReviewPolicy(
        auth.scope.tenantId,
        kind,
        reviewerUserId,
        auth.userId,
        tx
      );
      await this.repo.saveRoute(auth.scope, kind, policy.id, tx);
      await this.audit.log(
        {
          tenantId: auth.scope.tenantId,
          userId: auth.userId,
          action: "requests.routing.changed",
          entityType: "OperationalRequestRoute",
          entityId: policy.id,
          metadata: { workspaceId: auth.scope.workspaceId, kind, reviewerUserId },
        },
        tx
      );
      await this.repo.saveRouteReplay(auth.scope, commandKey, { fingerprint, route }, tx);
      return route;
    });
  }

  async download(id: string, attachmentId: string, ctx: UseCaseContext) {
    const auth = await this.authorize(ctx);
    const request = await this.requireOwnedRecord(auth.scope, auth.userId, id);
    if (!request.attachments.some((attachment) => attachment.id === attachmentId)) {
      throw new NotFoundException("Request attachment not found");
    }
    const url = await this.attachments.downloadUrl({ ...auth.scope, id }, attachmentId);
    if (!url) {
      throw new NotFoundException("Request attachment not found");
    }
    return { url };
  }

  async command(
    kind: Command["kind"],
    id: string,
    body: unknown,
    key: string | undefined,
    ctx: UseCaseContext
  ) {
    const initial = await this.authorize(ctx);
    const idempotencyKey = idKeySchema.parse(key);
    const parsed = parseCommand(kind, id, body);
    const fingerprint = digest(parsed);
    const commandKey = digest([initial.userId, idempotencyKey]);
    return this.repo.transaction(initial.scope, async (tx) => {
      if (parsed.kind === "create" || parsed.kind === "submit") {
        await this.staff.lock(initial.scope, tx);
      }
      const auth = await this.authorize(ctx, tx);
      if (!auth.can("requests.own.submit")) {
        throw new ForbiddenException("Request submission permission required");
      }
      const existing = await this.repo.replay(auth.scope, commandKey, tx);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          throw new ConflictException("The idempotency key is already used for another command");
        }
        await this.requireOwnedRecord(auth.scope, auth.userId, existing.record.id, tx);
        return this.project(existing.record, ctx, auth.can("documents.read"));
      }
      const now = new Date().toISOString();
      const previous =
        parsed.kind === "create"
          ? null
          : await this.requireOwnedRecord(auth.scope, auth.userId, parsed.id, tx);
      const next = await this.apply(parsed, previous, auth, ctx, now, tx);
      await this.repo.save(auth.scope, next, tx);
      await this.repo.saveReplay(auth.scope, commandKey, { fingerprint, record: next }, tx);
      await this.recordMutation(auth.scope, auth.userId, next, parsed.kind, ctx.correlationId, tx);
      return this.project(next, ctx, auth.can("documents.read"));
    });
  }

  private async apply(
    command: Command,
    previous: OperationalRequestRecord | null,
    auth: Awaited<ReturnType<OperationalRequestsUseCase["authorize"]>>,
    ctx: UseCaseContext,
    now: string,
    tx: TransactionContext
  ): Promise<OperationalRequestRecord> {
    if (command.kind === "create") {
      const requesterStaffId = await this.activeStaff(auth.scope, auth.userId, tx);
      await this.validatePolicy(command.draft.policyDocumentId, ctx, auth.can("documents.read"));
      return {
        id: randomUUID(),
        requesterUserId: auth.userId,
        requesterStaffId,
        kind: command.draft.kind,
        status: "DRAFT",
        draft: command.draft,
        version: 1,
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
        withdrawnAt: null,
        attachments: [],
        approval: null,
      };
    }
    if (!previous) {
      throw new NotFoundException("Request not found");
    }
    const version = command.kind === "attach" ? command.input.version : command.version;
    if (version !== previous.version) {
      throw new ConflictException("The request changed. Reload it before trying again.");
    }
    const next = { ...previous, version: previous.version + 1, updatedAt: now };
    if (command.kind === "withdraw") {
      if (previous.status === "WITHDRAWN") {
        throw new ConflictException("This request has already been withdrawn");
      }
      return { ...next, status: "WITHDRAWN", withdrawnAt: now };
    }
    if (previous.status !== "DRAFT") {
      throw new ConflictException("Only drafts can be changed or submitted");
    }
    if (command.kind === "update") {
      if (previous.kind !== command.draft.kind) {
        throw new BadRequestException("A draft's template cannot be changed");
      }
      await this.validatePolicy(command.draft.policyDocumentId, ctx, auth.can("documents.read"));
      return { ...next, draft: command.draft };
    }
    if (command.kind === "attach") {
      return {
        ...next,
        attachments: [
          ...next.attachments,
          await this.addAttachment(auth.scope, next, command.input, tx),
        ],
      };
    }
    const draft = SubmitOperationalRequestDraftSchema.parse(previous.draft);
    const staffId = await this.activeStaff(auth.scope, auth.userId, tx);
    if (staffId !== previous.requesterStaffId) {
      throw new ForbiddenException("The staff profile for this request has changed");
    }
    await this.validatePolicy(draft.policyDocumentId, ctx, auth.can("documents.read"));
    const policyId = await this.repo.route(auth.scope, next.kind, tx);
    const reviewerUserId = policyId ? await this.reviewerForPolicy(auth.scope, policyId, tx) : null;
    if (
      !policyId ||
      !reviewerUserId ||
      reviewerUserId === auth.userId ||
      !(await this.canReview(auth.scope, reviewerUserId, tx))
    ) {
      throw new ConflictException({
        code: OperationalRequestRoutingMissingCode,
        message: "No eligible reviewer is configured. Your draft is still saved.",
      });
    }
    return {
      ...next,
      draft,
      status: "SUBMITTED",
      submittedAt: now,
      approval: { policyId, reviewerUserId },
    };
  }

  private async addAttachment(
    scope: RequestScope,
    record: OperationalRequestRecord,
    input: AddOperationalRequestAttachment,
    tx: TransactionContext
  ) {
    if (record.attachments.length >= MAX_ATTACHMENTS) {
      throw new BadRequestException("A request can have up to five attachments");
    }
    const bytes = Buffer.from(input.base64, "base64");
    if (bytes.length > MAX_ATTACHMENT_BYTES || !beginsWithMediaSignature(bytes, input.mediaType)) {
      throw new BadRequestException("Select a PDF, PNG or JPEG file up to 2 MB");
    }
    const owner = { ...scope, id: record.id };
    const id = `${OPERATIONAL_REQUEST_DOCUMENT_PREFIX}${record.id}-${record.version}`;
    const staged = await this.attachments.stage(owner, {
      filename: input.name,
      contentType: input.mediaType,
      bytes,
    });
    await this.attachments.register(owner, staged, tx, id);
    return { id, name: staged.filename, mediaType: staged.contentType, size: staged.sizeBytes };
  }

  private async recordMutation(
    scope: RequestScope,
    userId: string,
    request: OperationalRequestRecord,
    kind: Command["kind"],
    correlationId: string | undefined,
    tx: TransactionContext
  ) {
    const action = `requests.operational.${kind}`;
    const { id, version, status } = request;
    await this.audit.log(
      {
        tenantId: scope.tenantId,
        userId,
        action,
        entityType: "OperationalRequest",
        entityId: id,
        metadata: { workspaceId: scope.workspaceId, version, status },
      },
      tx
    );
    if (kind === "submit" || kind === "withdraw") {
      await this.outbox.enqueue(
        {
          tenantId: scope.tenantId,
          eventType: action,
          payload: { requestId: id, workspaceId: scope.workspaceId, version },
          correlationId,
        },
        tx
      );
    }
  }

  private async reviewerForPolicy(scope: RequestScope, policyId: string, tx?: TransactionContext) {
    const definition = await this.approvals.findActiveOperationalReviewPolicy(
      scope.tenantId,
      policyId,
      tx
    );
    if (!definition) {
      return null;
    }
    try {
      const spec = approvalSpec.parse(JSON.parse(definition.spec));
      return spec.meta.policy.steps[0].assigneeUserId ?? null;
    } catch {
      return null;
    }
  }

  private async canReview(scope: RequestScope, userId: string, tx: TransactionContext) {
    try {
      const { permissions } = await this.permissions.execute({ ...scope, userId }, tx);
      return grants(permissions, "requests.review");
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return false;
      }
      throw error;
    }
  }

  private async activeStaff(scope: RequestScope, userId: string, tx: TransactionContext) {
    const staff = await this.staff.forAccount(scope, userId, tx);
    if (!staff) {
      throw new ForbiddenException("An active linked staff profile is required");
    }
    return staff.id;
  }

  private async requireOwnedRecord(
    scope: RequestScope,
    userId: string,
    id: string,
    tx?: TransactionContext
  ) {
    const record = await this.repo.get(scope, id, tx);
    if (!record || record.requesterUserId !== userId) {
      throw new NotFoundException("Request not found");
    }
    return record;
  }

  private async validatePolicy(id: string | null, ctx: UseCaseContext, permitted: boolean) {
    if (id && !(await this.canReadPolicy(id, ctx, permitted))) {
      throw new BadRequestException("The policy document is unavailable");
    }
  }

  private async canReadPolicy(id: string | null, ctx: UseCaseContext, permitted: boolean) {
    if (!id || !permitted) {
      return false;
    }
    const result = await this.documents.getDocument.execute({ documentId: id }, ctx);
    return isOk(result) && result.value.document.status === "READY";
  }

  private async project(
    record: OperationalRequestRecord,
    ctx: UseCaseContext,
    permitted: boolean
  ): Promise<OperationalRequest> {
    const {
      id,
      kind,
      status,
      draft,
      version,
      createdAt,
      updatedAt,
      submittedAt,
      withdrawnAt,
      attachments,
    } = record;
    const canReadPolicy = await this.canReadPolicy(draft.policyDocumentId, ctx, permitted);
    return {
      id,
      kind,
      status,
      version,
      createdAt,
      updatedAt,
      submittedAt,
      withdrawnAt,
      attachments,
      draft: { ...draft, policyDocumentId: canReadPolicy ? draft.policyDocumentId : null },
      canReadPolicy,
    };
  }

  private async authorize(ctx: UseCaseContext, tx?: TransactionContext) {
    const { tenantId, workspaceId, userId } = ctx;
    if (!tenantId || !workspaceId || !userId) {
      throw new ForbiddenException("Workspace membership required");
    }
    const { permissions } = await this.permissions.execute(ctx, tx);
    const can = (key: string) => grants(permissions, key);
    const entitlement = await this.entitlements.getTenantEntitlement(tenantId, tx);
    if (
      !can("requests.read") ||
      !entitlement.isAppEnabled("requests") ||
      !entitlement.isAppEnabled("people")
    ) {
      throw new ForbiddenException("Requests access denied");
    }
    return { scope: { tenantId, workspaceId }, userId, can };
  }
}

function grants(
  permissions: { allowed?: string[]; denied?: string[]; allowAll?: boolean },
  key: string
) {
  return (
    !permissions.denied?.includes(key) &&
    Boolean(permissions.allowAll || permissions.allowed?.includes(key))
  );
}

function parseCommand(kind: Command["kind"], id: string, raw: unknown): Command {
  switch (kind) {
    case "create":
      return { kind, draft: OperationalRequestDraftSchema.parse(raw) };
    case "update": {
      const { version, draft } = UpdateOperationalRequestSchema.parse(raw);
      return { kind, id, version, draft: draft as OperationalRequestDraft };
    }
    case "attach":
      return { kind, id, input: AddOperationalRequestAttachmentSchema.parse(raw) };
    default:
      return { kind, id, version: OperationalRequestVersionSchema.parse(raw).version };
  }
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function beginsWithMediaSignature(
  bytes: Buffer,
  mediaType: AddOperationalRequestAttachment["mediaType"]
) {
  const signatures = {
    "application/pdf": Buffer.from("%PDF-"),
    "image/png": Buffer.from("89504e470d0a1a0a", "hex"),
    "image/jpeg": Buffer.from("ffd8ff", "hex"),
  };
  const signature = signatures[mediaType];
  return bytes.subarray(0, signature.length).equals(signature);
}
