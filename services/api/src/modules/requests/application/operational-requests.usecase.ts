import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  AddOperationalRequestAttachmentSchema,
  ApplyOperationalRequestSchema,
  DecideOperationalRequestSchema,
  ApprovalPolicyStepSchema,
  ConfigureOperationalRequestRouteSchema,
  OperationalRequestDraftSchema,
  OperationalRequestKindSchema,
  OperationalRequestListQuerySchema,
  OperationalRequestReminderEvent,
  OperationalRequestReminderSchema,
  type OperationalRequestQueueStatus,
  OperationalRequestRoutingMissingCode,
  OperationalRequestVersionSchema,
  SubmitOperationalRequestDraftSchema,
  UpdateOperationalRequestSchema,
  type AddOperationalRequestAttachment,
  type OperationalRequest,
  type OperationalRequestDraft,
  type OperationalRequestReviewEntry,
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
import { StaffAbsenceUseCase, StaffOperationsLookup } from "../../people/public";
import { TenantEntitlementService } from "../../platform/public";
import { OperationalRequestRepository, type RequestScope } from "./ports/request-repository.port";
import type { OperationalRequestRecord } from "./request-record";

const PAGE_SIZE = 25;
const REVIEW_REMINDER_DELAY_MS = 24 * 60 * 60 * 1000;
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

type RequestAuthorization = {
  scope: RequestScope;
  userId: string;
  can: (key: string) => boolean;
};

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
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    private readonly absences: StaffAbsenceUseCase
  ) {}

  async list(query: unknown, ctx: UseCaseContext): Promise<OperationalRequestsPage> {
    const auth = await this.authorize(ctx);
    const records = await this.repo.list(auth.scope, auth.userId);
    return this.queuePage(records, query, auth);
  }

  async inbox(query: unknown, ctx: UseCaseContext): Promise<OperationalRequestsPage> {
    const initial = await this.authorize(ctx);
    if (!initial.can("requests.review")) {
      throw new ForbiddenException("Request review permission required");
    }
    return this.repo.transaction(initial.scope, async (tx) => {
      const auth = await this.authorize(ctx, tx);
      if (!auth.can("requests.review")) {
        throw new ForbiddenException("Request review permission required");
      }
      const records = await this.repo.listAssigned(auth.scope, auth.userId, tx);
      const policies = new Map<string, string | null>();
      const available: OperationalRequestRecord[] = [];
      for (const record of records) {
        if (!record.approval || !isAssignedReviewer(record, auth)) {
          continue;
        }
        const { policyId } = record.approval;
        if (!policies.has(policyId)) {
          policies.set(policyId, await this.reviewerForPolicy(auth.scope, policyId, tx));
        }
        if (policies.get(policyId) === auth.userId) {
          available.push(record);
        }
      }
      return {
        ...this.queuePage(available, query, auth, true),
        sourceUnavailable: records.length !== available.length,
      };
    });
  }

  private queuePage(
    records: OperationalRequestRecord[],
    query: unknown,
    auth: RequestAuthorization,
    reviewQueue = false
  ): OperationalRequestsPage {
    const { page, status: filter } = OperationalRequestListQuerySchema.parse(query);
    const now = new Date();
    const counts: Partial<Record<OperationalRequestQueueStatus, number>> = {};
    const items = records
      .map((record) => {
        const { id, kind, status, submittedAt, createdAt, updatedAt, application } = record;
        const queueStatus: OperationalRequestQueueStatus =
          application?.status === "PENDING"
            ? "PENDING_APPLICATION"
            : application?.status === "FAILED"
              ? "FAILED_APPLICATION"
              : application?.status === "APPLIED"
                ? "APPLIED"
                : status;
        counts[queueStatus] = (counts[queueStatus] ?? 0) + 1;
        const since =
          status === "SUBMITTED"
            ? (submittedAt ?? updatedAt)
            : status === "DRAFT"
              ? createdAt
              : updatedAt;
        return {
          id,
          kind,
          status,
          queueStatus,
          submittedAt,
          updatedAt,
          ageSeconds: Math.max(0, Math.floor((now.getTime() - Date.parse(since)) / 1000)),
        };
      })
      .filter((record) => !filter || filter === record.queueStatus);
    items.sort(
      (first, second) =>
        (reviewQueue
          ? second.ageSeconds - first.ageSeconds
          : second.updatedAt.localeCompare(first.updatedAt)) || first.id.localeCompare(second.id)
    );
    return {
      items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      counts,
      total: items.length,
      evaluatedAt: now.toISOString(),
      hasMore: items.length > page * PAGE_SIZE,
      canSubmit: auth.can("requests.own.submit"),
      canManageRouting: auth.can("requests.routing.manage"),
      canReview: auth.can("requests.review"),
    };
  }

  async detail(id: string, ctx: UseCaseContext) {
    const auth = await this.authorize(ctx);
    return this.project(await this.requireVisibleRecord(auth, id), ctx, auth);
  }

  async canRead(id: string, ctx: UseCaseContext): Promise<boolean> {
    try {
      const auth = await this.authorize(ctx);
      await this.requireVisibleRecord(auth, id);
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

  private async requireVisibleRecord(
    auth: RequestAuthorization,
    id: string,
    tx?: TransactionContext
  ) {
    const record = await this.repo.get(auth.scope, id, tx);
    if (
      !record ||
      (record.requesterUserId !== auth.userId &&
        (record.status === "RETURNED" ||
          !record.approval ||
          !isAssignedReviewer(record, auth) ||
          (await this.reviewerForPolicy(auth.scope, record.approval.policyId, tx)) !== auth.userId))
    ) {
      throw new NotFoundException("Request not found");
    }
    return record;
  }

  private async requireReviewer(auth: RequestAuthorization, id: string, tx: TransactionContext) {
    const record = await this.repo.get(auth.scope, id, tx);
    if (!record || (record.requesterUserId !== auth.userId && !isAssignedReviewer(record, auth))) {
      throw new NotFoundException("Request not found");
    }
    if (
      !isAssignedReviewer(record, auth) ||
      !record.approval ||
      (await this.reviewerForPolicy(auth.scope, record.approval.policyId, tx)) !== auth.userId
    ) {
      throw new ForbiddenException("Only the assigned reviewer can act on this request");
    }
    return record;
  }

  private async reviewReplay(
    auth: RequestAuthorization,
    key: string,
    fingerprint: string,
    tx: TransactionContext
  ) {
    const existing = await this.repo.replay(auth.scope, key, tx);
    if (existing && existing.fingerprint !== fingerprint) {
      throw new ConflictException("The idempotency key is already used for another command");
    }
    return existing?.record;
  }

  private async saveReviewMutation(
    auth: RequestAuthorization,
    record: OperationalRequestRecord,
    kind: "decide" | "apply" | "apply-failed",
    key: string,
    fingerprint: string,
    ctx: UseCaseContext,
    tx: TransactionContext
  ) {
    await this.repo.save(auth.scope, record, tx);
    await this.repo.saveReplay(auth.scope, key, { fingerprint, record }, tx);
    await this.recordMutation(auth.scope, auth.userId, record, kind, ctx.correlationId, tx);
    return this.project(record, ctx, auth);
  }

  async decide(id: string, raw: unknown, key: string | undefined, ctx: UseCaseContext) {
    const initial = await this.authorize(ctx);
    const input = DecideOperationalRequestSchema.parse(raw);
    const commandKey = digest([initial.userId, idKeySchema.parse(key)]);
    const fingerprint = digest(["decide", id, input]);
    return this.repo.transaction(initial.scope, async (tx) => {
      const auth = await this.authorize(ctx, tx);
      const record = await this.requireReviewer(auth, id, tx);
      const replay = await this.reviewReplay(auth, commandKey, fingerprint, tx);
      if (replay) {
        return this.project(replay, ctx, auth);
      }
      if (record.status !== "SUBMITTED" || record.version !== input.version) {
        throw new ConflictException("The request changed. Reload it before deciding.");
      }
      const next = nextVersion(record);
      const status = { APPROVE: "APPROVED", RETURN: "RETURNED", REJECT: "REJECTED" } as const;
      return this.saveReviewMutation(
        auth,
        {
          ...next,
          status: status[input.decision],
          review: appendReview(record, {
            action: input.decision,
            note: input.note,
            at: next.updatedAt,
            version: next.version,
          }),
          application:
            input.decision === "APPROVE" && record.kind === "ABSENCE"
              ? { status: "PENDING" }
              : null,
        },
        "decide",
        commandKey,
        fingerprint,
        ctx,
        tx
      );
    });
  }

  async applyApprovedAbsence(
    id: string,
    raw: unknown,
    key: string | undefined,
    ctx: UseCaseContext
  ) {
    const initial = await this.authorize(ctx);
    const input = ApplyOperationalRequestSchema.parse(raw);
    const commandKey = digest([initial.userId, idKeySchema.parse(key)]);
    const fingerprint = digest(["apply", id, input]);
    let attempted = false;
    try {
      return await this.repo.transaction(initial.scope, async (tx) => {
        const auth = await this.authorize(ctx, tx);
        const record = await this.requireReviewer(auth, id, tx);
        const replay = await this.reviewReplay(auth, commandKey, fingerprint, tx);
        if (replay) {
          return this.project(replay, ctx, auth);
        }
        if (!canApplyAbsence(record) || record.version !== input.version) {
          throw new ConflictException("The approved request changed. Reload it before applying.");
        }
        const draft = SubmitOperationalRequestDraftSchema.parse(record.draft);
        if (draft.kind !== "ABSENCE" || !draft.firstDay || !draft.lastDay) {
          throw new ConflictException("The approved absence is incomplete");
        }
        attempted = true;
        const applicationAbsenceId = await this.absences.applyReviewedAbsence(
          record.requesterStaffId,
          record.requesterUserId,
          {
            range: {
              kind: "full-day",
              startDate: draft.firstDay,
              endDate: followingDay(draft.lastDay),
              timezone: input.timezone,
            },
            reason: draft.reason,
            notes: null,
          },
          `request-${record.id}-${record.version}`,
          ctx,
          tx
        );
        const next = nextVersion(record);
        return this.saveReviewMutation(
          auth,
          {
            ...next,
            applicationAbsenceId,
            application: { status: "APPLIED", at: next.updatedAt },
          },
          "apply",
          commandKey,
          fingerprint,
          ctx,
          tx
        );
      });
    } catch (error) {
      if (!attempted) {
        throw error;
      }
      const failure =
        error instanceof HttpException && error.getStatus() < 500
          ? "REJECTED_BY_PEOPLE"
          : "TEMPORARILY_UNAVAILABLE";
      return this.repo.transaction(initial.scope, async (tx) => {
        const auth = await this.authorize(ctx, tx);
        const record = await this.requireReviewer(auth, id, tx);
        const replay = await this.reviewReplay(auth, commandKey, fingerprint, tx);
        if (replay) {
          return this.project(replay, ctx, auth);
        }
        if (!canApplyAbsence(record) || record.version !== input.version) {
          throw new ConflictException("The approved request changed. Reload it before retrying.");
        }
        return this.saveReviewMutation(
          auth,
          {
            ...nextVersion(record),
            application: { status: "FAILED", failure },
          },
          "apply-failed",
          commandKey,
          fingerprint,
          ctx,
          tx
        );
      });
    }
  }

  async download(id: string, attachmentId: string, ctx: UseCaseContext) {
    const auth = await this.authorize(ctx);
    const request = await this.requireVisibleRecord(auth, id);
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
        return this.project(existing.record, ctx, auth);
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
      if (parsed.kind === "submit") {
        await this.outbox.enqueue(
          {
            eventType: OperationalRequestReminderEvent,
            tenantId: auth.scope.tenantId,
            payload: {
              requestId: next.id,
              workspaceId: auth.scope.workspaceId,
              version: next.version,
            },
            correlationId: ctx.correlationId,
            availableAt: new Date(Date.parse(now) + REVIEW_REMINDER_DELAY_MS),
          },
          tx
        );
      }
      return this.project(next, ctx, auth);
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
        review: [],
        application: null,
        applicationAbsenceId: null,
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
      if (!["DRAFT", "SUBMITTED", "RETURNED"].includes(previous.status)) {
        throw new ConflictException("This request cannot be withdrawn");
      }
      return { ...next, status: "WITHDRAWN", withdrawnAt: now };
    }
    if (previous.status !== "DRAFT" && previous.status !== "RETURNED") {
      throw new ConflictException("Only drafts and returned requests can be changed or submitted");
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
      review: appendReview(previous, {
        action: "SUBMIT",
        at: now,
        note: null,
        version: next.version,
      }),
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
    kind: Command["kind"] | "decide" | "apply" | "apply-failed",
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
    if (["submit", "withdraw", "decide", "apply", "apply-failed"].includes(kind)) {
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
      return grants(permissions, "requests.read") && grants(permissions, "requests.review");
    } catch (error) {
      if (error instanceof ForbiddenException) {
        return false;
      }
      throw error;
    }
  }

  async deliverReminder(
    tenantId: string,
    raw: unknown,
    deliver: (
      input: {
        scope: RequestScope;
        reviewerUserId: string;
        requestId: string;
        version: number;
      },
      tx: TransactionContext
    ) => Promise<void>
  ): Promise<void> {
    const { workspaceId, requestId, version } = OperationalRequestReminderSchema.parse(raw);
    const scope = { tenantId, workspaceId };
    await this.repo.transaction(scope, async (tx) => {
      const record = await this.repo.get(scope, requestId, tx);
      if (!record?.approval || record.status !== "SUBMITTED" || record.version !== version) {
        return;
      }
      const reviewerUserId = record.approval.reviewerUserId;
      let auth: RequestAuthorization;
      try {
        auth = await this.authorize({ ...scope, userId: reviewerUserId }, tx);
      } catch (error) {
        if (error instanceof ForbiddenException || error instanceof NotFoundException) {
          return;
        }
        throw error;
      }
      if (
        !isAssignedReviewer(record, auth) ||
        (await this.reviewerForPolicy(scope, record.approval.policyId, tx)) !== reviewerUserId
      ) {
        return;
      }
      await deliver({ scope, reviewerUserId, requestId, version }, tx);
    });
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
    auth: RequestAuthorization
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
    const canReadPolicy = await this.canReadPolicy(
      draft.policyDocumentId,
      ctx,
      auth.can("documents.read")
    );
    const ownerCanWrite = record.requesterUserId === auth.userId && auth.can("requests.own.submit");
    const reviewer = isAssignedReviewer(record, auth);
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
      review: record.review,
      application: record.application,
      actions: {
        canEdit: ownerCanWrite && ["DRAFT", "RETURNED"].includes(status),
        canWithdraw: ownerCanWrite && ["DRAFT", "SUBMITTED", "RETURNED"].includes(status),
        canDecide: reviewer && status === "SUBMITTED",
        canApply: reviewer && canApplyAbsence(record),
      },
    };
  }

  private async authorize(
    ctx: UseCaseContext,
    tx?: TransactionContext
  ): Promise<RequestAuthorization> {
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

function isAssignedReviewer(record: OperationalRequestRecord, auth: RequestAuthorization) {
  return (
    record.requesterUserId !== auth.userId &&
    record.approval?.reviewerUserId === auth.userId &&
    auth.can("requests.review")
  );
}

function canApplyAbsence(record: OperationalRequestRecord) {
  return (
    record.kind === "ABSENCE" &&
    record.status === "APPROVED" &&
    (record.application?.status === "PENDING" || record.application?.status === "FAILED")
  );
}

function nextVersion(record: OperationalRequestRecord): OperationalRequestRecord {
  return { ...record, version: record.version + 1, updatedAt: new Date().toISOString() };
}

function appendReview(record: OperationalRequestRecord, entry: OperationalRequestReviewEntry) {
  if (record.review.length >= 250) {
    throw new ConflictException("The request review history limit was reached");
  }
  return [...record.review, entry];
}

function followingDay(date: string) {
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString().slice(0, 10);
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
