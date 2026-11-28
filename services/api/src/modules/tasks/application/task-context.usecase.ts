import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateTaskFollowUpSchema,
  MAX_TASK_ATTACHMENT_BYTES,
  TaskAttachmentUploadSchema,
  TaskCommentInputSchema,
  TaskSourceSchema,
  type TaskContext,
  type TaskSource,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  type AuditPort,
  type UseCaseContext,
  type TransactionContext,
} from "@corely/kernel";
import { TASK_ATTACHMENTS, type TaskAttachmentsPort } from "../../documents/public";
import { matchesReceiptAttachment } from "../../../shared/inbound-email/receipt-attachment";
import { StaffOperationsLookup } from "../../people/public";
import { EmployeeTasksUseCase } from "./employee-tasks.usecase";
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
  type TaskScope,
} from "./ports/task-repository.port";
import {
  TASK_CONTEXT_STORE,
  TASK_SOURCE_READERS,
  type StoredTaskContext,
  type TaskContextStore,
  type TaskSourceReaders,
} from "./ports/task-context.port";

type ContextAction = "comment" | "link" | "file";

@Injectable()
export class TaskContextUseCase {
  constructor(
    private readonly tasks: EmployeeTasksUseCase,
    private readonly staff: StaffOperationsLookup,
    @Inject(TASK_REPOSITORY) private readonly tasksRepo: TaskRepositoryPort,
    @Inject(TASK_CONTEXT_STORE) private readonly context: TaskContextStore,
    @Inject(TASK_SOURCE_READERS) private readonly sources: TaskSourceReaders,
    @Inject(TASK_ATTACHMENTS) private readonly files: TaskAttachmentsPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort
  ) {}

  async get(taskId: string, ctx: UseCaseContext): Promise<TaskContext> {
    const {
      auth: { scope },
    } = await this.tasks.authorizeVisibleTask(taskId, ctx);
    const record = await this.context.get(scope, taskId);
    const sources = await Promise.all(
      record.sources.map(
        async (source): Promise<TaskContext["sources"][number]> =>
          (await this.canRead(source, ctx))
            ? { ...source, status: "available" }
            : { kind: source.kind, status: "unavailable" }
      )
    );
    return { ...record, sources };
  }

  async addComment(taskId: string, body: unknown, key: string | undefined, ctx: UseCaseContext) {
    const input = TaskCommentInputSchema.parse(body);
    await this.mutate("comment", taskId, input, key, ctx, async ({ value, actor }) => {
      if (value.comments.length >= 200) {
        throw new ConflictException("This task has reached its comment limit");
      }
      value.comments.push({
        id: randomUUID(),
        text: input.text,
        authorUserId: actor,
        createdAt: new Date().toISOString(),
      });
    });
    return this.get(taskId, ctx);
  }

  async addSource(taskId: string, body: unknown, key: string | undefined, ctx: UseCaseContext) {
    const source = TaskSourceSchema.parse(body);
    await this.mutate("link", taskId, source, key, ctx, async ({ value, tx }) => {
      await this.requireSource(source, ctx, tx);
      if (value.sources.some((entry) => entry.kind === source.kind && entry.id === source.id)) {
        return;
      }
      if (value.sources.length >= 20) {
        throw new ConflictException("This task has reached its source limit");
      }
      value.sources.push(source);
    });
    return this.get(taskId, ctx);
  }

  async upload(taskId: string, body: unknown, key: string | undefined, ctx: UseCaseContext) {
    const { base64, contentType, filename } = TaskAttachmentUploadSchema.parse(body);
    const bytes = Buffer.from(base64, "base64");
    if (
      bytes.length > MAX_TASK_ATTACHMENT_BYTES ||
      bytes.toString("base64") !== base64 ||
      !matchesReceiptAttachment(contentType, bytes)
    ) {
      throw new BadRequestException("Invalid attachment content");
    }
    await this.mutate(
      "file",
      taskId,
      { filename, contentType, base64 },
      key,
      ctx,
      async ({ scope, value, tx }) => {
        if (value.files.length >= 20) {
          throw new ConflictException("This task has reached its attachment limit");
        }
        value.files.push(
          await this.files.upload({ ...scope, taskId }, { filename, contentType, bytes }, tx)
        );
      }
    );
    return this.get(taskId, ctx);
  }

  async download(taskId: string, documentId: string, ctx: UseCaseContext) {
    const {
      auth: { scope },
    } = await this.tasks.authorizeVisibleTask(taskId, ctx);
    const file = (await this.context.get(scope, taskId)).files.find(
      (entry) => entry.documentId === documentId
    );
    const bytes = file ? await this.files.download({ ...scope, taskId }, documentId) : null;
    if (!file || !bytes) {
      throw new NotFoundException("Attachment unavailable");
    }
    return { file, bytes };
  }

  async createFollowUp(body: unknown, key: string | undefined, ctx: UseCaseContext) {
    const { source, task } = CreateTaskFollowUpSchema.parse(body);
    return this.tasks.command("create", null, task, key, ctx, undefined, {
      source,
      check: (_scope, tx) => this.requireSource(source, ctx, tx),
      attach: async (scope, taskId, tx) => {
        await this.context.save(scope, taskId, { comments: [], files: [], sources: [source] }, tx);
        await this.recordAudit("follow-up", scope, taskId, ctx, tx, source);
      },
    });
  }

  private async canRead(source: TaskSource, ctx: UseCaseContext, tx?: TransactionContext) {
    return (await this.sources[source.kind]?.canRead(source.id, ctx, tx)) ?? false;
  }

  private async requireSource(source: TaskSource, ctx: UseCaseContext, tx: TransactionContext) {
    if (!(await this.canRead(source, ctx, tx))) {
      throw new NotFoundException("Source unavailable");
    }
  }

  private async mutate(
    action: ContextAction,
    taskId: string,
    input: unknown,
    key: string | undefined,
    ctx: UseCaseContext,
    apply: (input: {
      scope: TaskScope;
      value: StoredTaskContext;
      actor: string;
      tx: TransactionContext;
    }) => Promise<void>
  ) {
    const initial = await this.tasks.authorize(ctx);
    if (!key || key.length > 160 || !/^[\w-]+$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const commandKey = createHash("sha256")
      .update(JSON.stringify(["context", initial.actorUserId, key]))
      .digest("hex");
    const fingerprint = createHash("sha256")
      .update(JSON.stringify([action, taskId, input]))
      .digest("hex");
    await this.tasksRepo.transaction(initial.scope, async (tx) => {
      await this.staff.lock(initial.scope, tx);
      const { auth } = await this.tasks.authorizeVisibleTask(taskId, ctx, tx);
      if (!auth.manage && !auth.completeOwn) {
        throw new ForbiddenException("Task updates are unavailable for this account");
      }
      const replay = await this.tasksRepo.replay(auth.scope, commandKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used for another command");
        }
        return;
      }
      const value = await this.context.get(auth.scope, taskId, tx);
      await apply({ scope: auth.scope, value, actor: auth.actorUserId, tx });
      await this.context.save(auth.scope, taskId, value, tx);
      await this.recordAudit(action, auth.scope, taskId, ctx, tx);
      await this.tasksRepo.saveReplay(auth.scope, commandKey, { fingerprint, taskId }, tx);
    });
  }

  private recordAudit(
    action: ContextAction | "follow-up",
    scope: TaskScope,
    taskId: string,
    ctx: UseCaseContext,
    tx: TransactionContext,
    source?: TaskSource
  ) {
    return this.audit.log(
      {
        tenantId: scope.tenantId,
        userId: ctx.userId ?? "",
        entityType: "EmployeeTask",
        entityId: taskId,
        action: "tasks.context." + action,
        metadata: { workspaceId: scope.workspaceId, ...(source ? { source } : {}) },
      },
      tx
    );
  }
}
