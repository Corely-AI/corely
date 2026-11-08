import { persistTaskMutation } from "./task-mutation";
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
  CreateEmployeeTaskSchema,
  UpdateEmployeeTaskSchema,
  TransitionEmployeeTaskSchema,
  ToggleChecklistStepSchema,
  ListEmployeeTasksSchema,
  type EmployeeTask,
  type EmployeeTaskList,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  type AuditPort,
  type OutboxPort,
  type UseCaseContext,
  type TransactionContext,
} from "@corely/kernel";
import { GetEffectivePermissionsUseCase } from "../../identity/public";
import { TenantEntitlementService } from "../../platform/public";
import { StaffOperationsLookup } from "../../people/public";
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
  type TaskScope,
} from "./ports/task-repository.port";
import { transitionTask, type TaskRecord } from "../domain/task-rules";

type Command = "create" | "update" | "complete" | "reopen" | "checklist";
@Injectable()
export class EmployeeTasksUseCase {
  constructor(
    @Inject(TASK_REPOSITORY) private readonly repo: TaskRepositoryPort,
    private readonly permissions: GetEffectivePermissionsUseCase,
    private readonly staff: StaffOperationsLookup,
    private readonly entitlements: TenantEntitlementService,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}
  async authorize(ctx: UseCaseContext, tx?: TransactionContext) {
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      throw new ForbiddenException("Workspace membership required");
    }
    const { permissions } = await this.permissions.execute(ctx, tx);
    const can = (key: string) =>
      !permissions.denied.includes(key) &&
      (permissions.allowAll || permissions.allowed.includes(key));
    if (!can("tasks.read")) {
      throw new ForbiddenException("Task access denied");
    }
    for (const app of ["tasks", "people"]) {
      if (!(await this.entitlements.isAppEnabled(ctx.tenantId, app, tx))) {
        throw new ForbiddenException("Tasks and People must be enabled");
      }
    }
    const scope: TaskScope = { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId };
    const self = await this.staff.forAccount(scope, ctx.userId, tx);
    return {
      scope,
      self,
      actorUserId: ctx.userId,
      manage: can("tasks.manage"),
      completeOwn: can("tasks.own.update"),
    };
  }
  private async projection(
    scope: TaskScope,
    record: TaskRecord,
    tx?: TransactionContext
  ): Promise<EmployeeTask> {
    const owner = await this.staff.get(scope, record.ownerStaffId, tx);
    return {
      ...record,
      ownerName: owner?.displayName ?? record.ownerName,
      ownerArchived: !owner || Boolean(owner.archivedAt),
    };
  }
  private async record(scope: TaskScope, id: string, tx?: TransactionContext) {
    const record = await this.repo.get(scope, id, tx);
    if (!record || record.workspaceId !== scope.workspaceId) {
      throw new NotFoundException("Task not found");
    }
    return record;
  }
  private visible(
    record: TaskRecord,
    auth: Awaited<ReturnType<EmployeeTasksUseCase["authorize"]>>
  ) {
    if (!auth.manage && record.ownerStaffId !== auth.self?.id) {
      throw new NotFoundException("Task not found");
    }
  }
  async list(query: unknown, ctx: UseCaseContext): Promise<EmployeeTaskList> {
    const auth = await this.authorize(ctx);
    const input = ListEmployeeTasksSchema.parse(query);
    const records = (await this.repo.list(auth.scope))
      .filter(
        (t) =>
          (auth.manage || t.ownerStaffId === auth.self?.id) &&
          (input.status === "all" || t.status === input.status)
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
    return {
      page: input.page,
      pageSize: input.pageSize,
      total: records.length,
      items: await Promise.all(
        records
          .slice((input.page - 1) * input.pageSize, input.page * input.pageSize)
          .map((t) => this.projection(auth.scope, t))
      ),
      capabilities: { manage: auth.manage, completeOwn: auth.completeOwn && Boolean(auth.self) },
    };
  }
  async assignees(ctx: UseCaseContext) {
    const auth = await this.authorize(ctx);
    if (!auth.manage) {
      throw new ForbiddenException("Task management required");
    }
    return (await this.staff.list(auth.scope))
      .filter((p) => !p.archivedAt)
      .map(({ id, displayName }) => ({ id, displayName }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id));
  }
  async detail(id: string, ctx: UseCaseContext) {
    const auth = await this.authorize(ctx);
    const task = await this.record(auth.scope, id);
    this.visible(task, auth);
    return this.projection(auth.scope, task);
  }
  async command(
    kind: Command,
    id: string | null,
    body: unknown,
    key: string | undefined,
    ctx: UseCaseContext,
    stepId?: string
  ) {
    const initial = await this.authorize(ctx);
    if (!key || key.length > 160 || !/^[\w-]+$/.test(key)) {
      throw new BadRequestException("A valid Idempotency-Key is required");
    }
    const input =
      kind === "create"
        ? CreateEmployeeTaskSchema.parse(body)
        : kind === "update"
          ? UpdateEmployeeTaskSchema.parse(body)
          : kind === "checklist"
            ? ToggleChecklistStepSchema.parse(body)
            : TransitionEmployeeTaskSchema.parse(body);
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(kind === "checklist" ? [kind, id, stepId, input] : [kind, id, input]))
      .digest("hex");
    const commandKey = createHash("sha256")
      .update(JSON.stringify([ctx.userId, key]))
      .digest("hex");
    return this.repo.transaction(initial.scope, async (tx) => {
      // Coordinate assignment with People archival/link changes before checking the current owner.
      await this.staff.lock(initial.scope, tx);
      const auth = await this.authorize(ctx, tx);
      if ((kind === "create" || kind === "update") && !auth.manage) {
        throw new ForbiddenException("Task management required");
      }
      if (!auth.manage && !auth.completeOwn) {
        throw new ForbiddenException("Task completion denied");
      }
      const replay = await this.repo.replay(auth.scope, commandKey, tx);
      if (replay) {
        if (replay.fingerprint !== fingerprint) {
          throw new ConflictException("Idempotency key already used for another command");
        }
        const record = await this.record(auth.scope, replay.taskId, tx);
        this.visible(record, auth);
        return this.projection(auth.scope, record, tx);
      }
      const previous = id ? await this.record(auth.scope, id, tx) : null;
      if (previous) {
        this.visible(previous, auth);
        if (!("version" in input) || input.version !== previous.version) {
          throw new ConflictException("Task changed; reload before saving");
        }
      }
      const now = new Date().toISOString();
      let next: TaskRecord;
      if (kind === "create" || kind === "update") {
        const fields = CreateEmployeeTaskSchema.parse(
          Object.fromEntries(Object.entries(input).filter(([key]) => key !== "version"))
        );
        const owner = await this.staff.get(auth.scope, fields.ownerStaffId, tx);
        // Updating a historical task without changing its archived owner preserves history.
        const unchangedOwner = previous?.ownerStaffId === fields.ownerStaffId;
        if (!owner || (owner.archivedAt && !unchangedOwner)) {
          throw new BadRequestException("Assignee must be active in this workspace");
        }
        next = {
          ...fields,
          id: previous?.id ?? randomUUID(),
          workspaceId: auth.scope.workspaceId,
          ownerName: owner.displayName,
          status: previous?.status ?? "OPEN",
          version: (previous?.version ?? 0) + 1,
          createdAt: previous?.createdAt ?? now,
          updatedAt: now,
          completedAt: previous?.completedAt ?? null,
          ...(previous?.recurrence ? { recurrence: previous.recurrence } : {}),
          ...(previous?.checklist ? { checklist: previous.checklist } : {}),
        };
      } else {
        if (!previous) {
          throw new NotFoundException("Task not found");
        }
        if (kind === "checklist") {
          if (previous.status !== "OPEN") {
            throw new ConflictException("Reopen the task before changing its checklist");
          }
          const step = previous.checklist?.find((item) => item.id === stepId);
          if (!step) {
            throw new NotFoundException("Checklist item not found");
          }
          const toggle = ToggleChecklistStepSchema.parse(input);
          if (step.completed === toggle.completed) {
            throw new ConflictException("Checklist item already has this state");
          }
          next = {
            ...previous,
            checklist: (previous.checklist ?? []).map((item) =>
              item.id === stepId ? { ...item, completed: toggle.completed } : item
            ),
            version: previous.version + 1,
            updatedAt: now,
          };
        } else {
          const completed = kind === "complete";
          if (completed && previous.checklist?.some((item) => !item.completed)) {
            throw new ConflictException("Complete every checklist item first");
          }
          if ((previous.status === "COMPLETED") === completed) {
            throw new ConflictException("Task already has this status; reload before saving");
          }
          next = transitionTask(previous, completed, now);
        }
      }
      await persistTaskMutation(
        { repo: this.repo, audit: this.audit, outbox: this.outbox },
        auth.scope,
        next,
        kind,
        ctx,
        tx
      );
      await this.repo.saveReplay(auth.scope, commandKey, { fingerprint, taskId: next.id }, tx);
      return this.projection(auth.scope, next, tx);
    });
  }
}
