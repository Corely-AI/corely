import { planOnDate } from "../domain/recurring-checklist";
import { ForbiddenException, Injectable, Inject, BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService, PrismaExtKvAdapter } from "@corely/data";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  CLOCK_PORT_TOKEN,
  civilDateAt,
  addCivilDays,
  type AuditPort,
  type OutboxPort,
  type ClockPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import {
  ApproveStaffOnboardingSchema,
  type StaffTaskFollowup,
  type EmployeeTask,
} from "@corely/contracts";
import { StaffOperationsLookup } from "../../people/public";
import { GetEffectivePermissionsUseCase } from "../../identity/public";
import { TenantEntitlementService } from "../../platform/public";
import { authorizeTasks } from "../application/task-access-policy";
import { persistTaskMutation } from "../application/task-mutation";
import { ExtTaskRepositoryAdapter } from "./ext-task-repository.adapter";
import { ExtRecurringChecklistAdapter } from "./ext-recurring-checklist.adapter";
import type { TaskScope } from "../application/ports/task-repository.port";
@Injectable()
export class StaffTasksAdapter {
  private readonly repo: ExtTaskRepositoryAdapter;
  private readonly recurring: ExtRecurringChecklistAdapter;
  constructor(
    prisma: PrismaService,
    kv: PrismaExtKvAdapter,
    private readonly permissions: GetEffectivePermissionsUseCase,
    private readonly entitlements: TenantEntitlementService,
    private readonly staff: StaffOperationsLookup,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {
    this.repo = new ExtTaskRepositoryAdapter(prisma, kv);
    this.recurring = new ExtRecurringChecklistAdapter(prisma, kv);
  }
  transaction<T>(scope: TaskScope, work: (tx: TransactionContext) => Promise<T>) {
    return this.repo.transaction(scope, work);
  }
  private authorize(ctx: UseCaseContext, tx: TransactionContext) {
    return authorizeTasks(
      { permissions: this.permissions, staff: this.staff, entitlements: this.entitlements },
      ctx,
      tx
    );
  }
  async checklist(
    ctx: UseCaseContext,
    staffId: string,
    taskId: string | null,
    tx: TransactionContext
  ): Promise<{ available: boolean; task: EmployeeTask | null }> {
    try {
      const auth = await this.authorize(ctx, tx);
      if (!auth.manage && auth.self?.id !== staffId) {
        throw new ForbiddenException("Task access denied");
      }
      const task = taskId ? await this.repo.get(auth.scope, taskId, tx) : null;
      if (
        task &&
        (task.workspaceId !== auth.scope.workspaceId ||
          (!auth.manage && task.ownerStaffId !== staffId))
      ) {
        return { available: true, task: null };
      }
      const owner = task ? await this.staff.get(auth.scope, task.ownerStaffId, tx) : null;
      return {
        available: true,
        task: task
          ? {
              ...task,
              ownerName: owner?.displayName ?? task.ownerName,
              ownerArchived: !owner || Boolean(owner.archivedAt),
            }
          : null,
      };
    } catch (error) {
      if (!(error instanceof ForbiddenException)) {
        throw error;
      }
      return { available: false, task: null };
    }
  }
  async followup(
    ctx: UseCaseContext,
    staffId: string,
    tx: TransactionContext
  ): Promise<StaffTaskFollowup> {
    try {
      const auth = await this.authorize(ctx, tx);
      if (!auth.manage) {
        throw new ForbiddenException("Task management required");
      }
      const owner = await this.staff.get(auth.scope, staffId, tx);
      const open = (await this.repo.list(auth.scope, tx)).filter(
        (task) => task.ownerStaffId === staffId && task.status === "OPEN"
      );
      const now = this.clock.now();
      const recurringTemplates = (await this.recurring.list(auth.scope, tx))
        .filter((row) => {
          if (row.state === "ENDED") {
            return false;
          }
          const today = civilDateAt(now, row.timezone);
          return row.plans.some((plan) => {
            const start = plan.effectiveFrom > today ? plan.effectiveFrom : today;
            return [0, 1, 2, 3, 4, 5, 6].some((offset) =>
              planOnDate(row, addCivilDays(start, offset))?.assigneeIds.includes(staffId)
            );
          });
        })
        .map((row) => ({ id: row.id, title: row.plans.at(-1)?.title ?? "" }));
      return {
        available: true,
        openTaskCount: open.length,
        openTasks: open.slice(0, 50).map((task) => ({
          ...task,
          ownerName: owner?.displayName ?? task.ownerName,
          ownerArchived: !owner || Boolean(owner.archivedAt),
        })),
        recurringTemplates,
      };
    } catch (error) {
      if (!(error instanceof ForbiddenException)) {
        throw error;
      }
      return { available: false, openTaskCount: 0, openTasks: [], recurringTemplates: [] };
    }
  }
  async approve(
    ctx: UseCaseContext,
    staffId: string,
    body: unknown,
    tx: TransactionContext
  ): Promise<EmployeeTask> {
    const input = ApproveStaffOnboardingSchema.parse(body),
      auth = await this.authorize(ctx, tx);
    if (!auth.manage) {
      throw new ForbiddenException("Task management required");
    }
    const owner = await this.staff.get(auth.scope, staffId, tx);
    if (!owner || owner.archivedAt) {
      throw new BadRequestException("An active assignee is required");
    }
    const now = this.clock.now().toISOString();
    const task = {
      id: randomUUID(),
      workspaceId: auth.scope.workspaceId,
      title: input.title,
      ownerStaffId: staffId,
      ownerName: owner.displayName,
      dueAt: input.dueAt,
      checklist: input.steps.map((step) => ({ ...step, completed: false })),
      status: "OPEN" as const,
      version: 1,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    await persistTaskMutation(
      { repo: this.repo, audit: this.audit, outbox: this.outbox },
      auth.scope,
      task,
      "create",
      ctx,
      tx
    );
    return { ...task, ownerArchived: false };
  }
}
