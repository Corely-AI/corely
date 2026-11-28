import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateProcedureSchema,
  ProcedureFileMaxBytes,
  ProcedureTransitionSchema,
  UpdateProcedureSchema,
  type ProcedureDetail,
  type ProcedureList,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import { PROCEDURE_DOCUMENTS, type ProcedureDocuments } from "../../documents/public";
import {
  GetEffectivePermissionsUseCase,
  USER_REPOSITORY_TOKEN,
  type UserRepositoryPort,
} from "../../identity/public";
import { TenantEntitlementService } from "../../platform/public";
import { publishProcedure, type ProcedureRecord } from "../domain/procedure";
import {
  PROCEDURE_REPOSITORY,
  type ProcedureRepository,
  type ProcedureScope,
} from "./ports/procedure-repository.port";

type Command = "create" | "edit" | "publish" | "archive";
type Input = ReturnType<typeof UpdateProcedureSchema.parse>;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function commandId(values: unknown) {
  // An upload retried after a transaction failure writes to the same storage key.
  const hex = hash(values);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

@Injectable()
export class ProceduresUseCase {
  constructor(
    @Inject(PROCEDURE_REPOSITORY) private readonly repo: ProcedureRepository,
    @Inject(PROCEDURE_DOCUMENTS) private readonly files: ProcedureDocuments,
    @Inject(GetEffectivePermissionsUseCase)
    private readonly permissions: Pick<GetEffectivePermissionsUseCase, "execute">,
    @Inject(TenantEntitlementService)
    private readonly entitlements: Pick<TenantEntitlementService, "isAppEnabled">,
    @Inject(USER_REPOSITORY_TOKEN) private readonly users: Pick<UserRepositoryPort, "findById">,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}

  private async authorize(ctx: UseCaseContext, tx?: TransactionContext) {
    const { tenantId, workspaceId, userId } = ctx;
    if (!tenantId || !workspaceId || !userId) {
      throw new ForbiddenException("Workspace membership required");
    }
    const { permissions } = await this.permissions.execute(ctx, tx);
    const can = (key: string) =>
      !permissions.denied.includes(key) &&
      (permissions.allowAll || permissions.allowed.includes(key));
    if (
      !can("knowledge.read") ||
      !(await this.entitlements.isAppEnabled(tenantId, "knowledge", tx))
    ) {
      throw new ForbiddenException("Knowledge access denied");
    }
    return { scope: { tenantId, workspaceId }, userId, canManage: can("knowledge.manage") };
  }

  private async record(scope: ProcedureScope, id: string, tx?: TransactionContext) {
    const record = await this.repo.get(scope, id, tx);
    if (!record) {
      throw new NotFoundException("Procedure not found");
    }
    return record;
  }

  private view(record: ProcedureRecord, canManage: boolean): ProcedureDetail {
    if (canManage) {
      return { ...record, canManage };
    }
    if (record.archivedAt || !record.published) {
      throw new NotFoundException("Procedure not found");
    }
    return { ...record, draft: null, revision: record.published.version, canManage };
  }

  async list(ctx: UseCaseContext): Promise<ProcedureList> {
    const { scope, canManage } = await this.authorize(ctx);
    const items = (await this.repo.list(scope))
      .filter((r) => canManage || (!r.archivedAt && r.published))
      .flatMap((r): ProcedureList["items"] => {
        const fields = canManage ? (r.draft ?? r.published) : r.published;
        if (!fields) {
          return [];
        }
        return [
          {
            id: r.id,
            ownerName: r.ownerName,
            title: fields.title,
            reviewDate: fields.reviewDate,
            publishedVersion: r.published?.version ?? null,
            status: r.archivedAt ? "archived" : r.published ? "published" : "draft",
            hasDraft: canManage && r.draft !== null,
          },
        ];
      })
      .sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    return { canManage, items };
  }

  async detail(id: string, ctx: UseCaseContext) {
    const { scope, canManage } = await this.authorize(ctx);
    return this.view(await this.record(scope, id), canManage);
  }

  async download(id: string, fileId: string, ctx: UseCaseContext) {
    const { scope, canManage } = await this.authorize(ctx);
    const record = this.view(await this.record(scope, id), canManage);
    const file = [record.draft?.content, record.published?.content].find(
      (content) => content?.kind === "file" && content.fileId === fileId
    );
    if (file?.kind !== "file") {
      throw new NotFoundException("Procedure file not found");
    }
    const bytes = await this.files.read({ ...scope, procedureId: id }, fileId);
    if (!bytes) {
      throw new NotFoundException("Procedure file not found");
    }
    return { bytes, filename: file.filename };
  }

  private async content(
    scope: ProcedureScope,
    procedureId: string,
    fileId: string,
    content: Input["content"],
    previous: ProcedureRecord | null,
    tx: TransactionContext
  ) {
    if (content.kind !== "file") {
      return content;
    }
    if (!content.upload) {
      const retained = (previous?.draft ?? previous?.published)?.content;
      if (retained?.kind !== "file") {
        throw new BadRequestException("Select a file");
      }
      return retained;
    }
    const bytes = Buffer.from(content.upload.base64, "base64");
    if (
      !bytes.length ||
      bytes.length > ProcedureFileMaxBytes ||
      bytes.toString("base64") !== content.upload.base64
    ) {
      throw new BadRequestException("Invalid procedure file");
    }
    const filename = content.upload.filename;
    await this.files.store({ ...scope, procedureId }, fileId, { filename, bytes }, tx);
    return { kind: "file" as const, fileId, filename };
  }

  async command(
    kind: Command,
    id: string | undefined,
    body: unknown,
    key: string | undefined,
    ctx: UseCaseContext
  ) {
    const initial = await this.authorize(ctx);
    if (!initial.canManage) {
      throw new ForbiddenException("Knowledge management required");
    }
    if (!key || key.length > 160 || !/^[\w-]+$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const input =
      kind === "create"
        ? CreateProcedureSchema.parse(body)
        : kind === "edit"
          ? UpdateProcedureSchema.parse(body)
          : ProcedureTransitionSchema.parse(body);
    const commandKey = hash([initial.userId, key]);
    const fingerprint = hash([kind, id, input]);

    return this.repo.transaction(initial.scope, async (tx) => {
      const { scope, userId, canManage } = await this.authorize(ctx, tx);
      if (!canManage) {
        throw new ForbiddenException("Knowledge management required");
      }
      const replay = await this.repo.getReplay(scope, commandKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used");
        }
        return this.view(await this.record(scope, replay.procedureId, tx), true);
      }

      const previous = id ? await this.record(scope, id, tx) : null;
      if (
        previous &&
        (previous.archivedAt || !("revision" in input) || previous.revision !== input.revision)
      ) {
        throw new ConflictException("Procedure changed or has been archived");
      }
      const procedureId = id ?? commandId([scope, commandKey]);
      const now = new Date();
      const record: ProcedureRecord = previous
        ? { ...previous, revision: previous.revision + 1 }
        : {
            id: procedureId,
            ownerUserId: userId,
            ownerName: (await this.users.findById(userId, tx))?.getName() ?? null,
            revision: 1,
            draft: null,
            published: null,
            archivedAt: null,
          };

      if ("content" in input) {
        const fileId = commandId([procedureId, commandKey, fingerprint]);
        record.draft = {
          title: input.title,
          reviewDate: input.reviewDate,
          content: await this.content(scope, procedureId, fileId, input.content, previous, tx),
        };
      } else if (kind === "publish") {
        if (!record.draft) {
          throw new ConflictException("Save a draft before publishing");
        }
        record.published = publishProcedure(record.draft, record.published, now);
        record.draft = null;
        await this.repo.saveVersion(scope, procedureId, record.published, tx);
      } else {
        record.archivedAt = now.toISOString();
      }

      await this.repo.save(scope, record, tx);
      await this.repo.saveReplay(scope, commandKey, { fingerprint, procedureId }, tx);
      await this.audit.log(
        {
          tenantId: scope.tenantId,
          userId,
          action: `knowledge.procedure.${kind}`,
          entityType: "Procedure",
          entityId: procedureId,
          metadata: {
            workspaceId: scope.workspaceId,
            revision: record.revision,
            version: record.published?.version ?? null,
          },
        },
        tx
      );
      if (kind === "publish" || kind === "archive") {
        await this.outbox.enqueue(
          {
            tenantId: scope.tenantId,
            eventType: `knowledge.procedure.${kind}`,
            correlationId: ctx.correlationId,
            payload: {
              workspaceId: scope.workspaceId,
              procedureId,
              version: record.published?.version ?? null,
            },
          },
          tx
        );
      }
      return this.view(record, true);
    });
  }
}
