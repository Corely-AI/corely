import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import {
  CLOCK_PORT_TOKEN,
  AUDIT_PORT,
  OUTBOX_PORT,
  civilDayWindow,
  resolveCivilMinute,
  type ClockPort,
  type AuditPort,
  type OutboxPort,
  type TransactionContext,
  type UseCaseContext,
} from "@corely/kernel";
import type { ChecklistOccurrence } from "@corely/contracts";
import { StaffOperationsLookup, StaffWorkdayLookup } from "../../people/public";
import { EmployeeTasksUseCase } from "./employee-tasks.usecase";
import {
  RECURRING_CHECKLIST_REPOSITORY,
  type RecurringChecklistRepository,
} from "./ports/recurring-checklist-repository.port";
import {
  TASK_REPOSITORY,
  type TaskRepositoryPort,
  type TaskScope,
} from "./ports/task-repository.port";
import {
  occurrenceId,
  planOnDate,
  isPausedOnDate,
  type ChecklistRecord,
} from "../domain/recurring-checklist";
import { persistTaskMutation } from "./task-mutation";

@Injectable()
export class ChecklistMaterializer {
  constructor(
    @Inject(RECURRING_CHECKLIST_REPOSITORY)
    private readonly templates: RecurringChecklistRepository,
    @Inject(TASK_REPOSITORY) private readonly tasks: TaskRepositoryPort,
    private readonly access: EmployeeTasksUseCase,
    private readonly staff: StaffOperationsLookup,
    private readonly workdays: StaffWorkdayLookup,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort
  ) {}
  async generate(
    scope: TaskScope,
    template: ChecklistRecord,
    date: string,
    tx: TransactionContext,
    manual?: UseCaseContext
  ): Promise<ChecklistOccurrence | null> {
    const plan = planOnDate(template, date);
    if (!plan || template.state === "ENDED") {
      if (manual) {
        throw new BadRequestException("No checklist is scheduled for this date");
      }
      return null;
    }
    const previous = await this.templates.occurrence(scope, template.id, date, tx);
    if (previous) {
      return previous;
    }
    const ctx: UseCaseContext = manual ?? {
      ...scope,
      userId: plan.publisherUserId,
      correlationId: occurrenceId(scope.tenantId, scope.workspaceId, template.id, date),
    };
    const now = this.clock.now().toISOString();
    let reason: ChecklistOccurrence["reason"] = null;
    try {
      const auth = await this.access.authorize(ctx, tx);
      if (!auth.manage) {
        throw new ForbiddenException("Task management required");
      }
    } catch (error) {
      if (manual || !(error instanceof ForbiddenException)) {
        throw error;
      }
      reason = "PUBLISHER_ACCESS";
    }
    if (!reason && isPausedOnDate(template, date)) {
      reason = "PAUSED";
    }
    const due = reason ? null : resolveCivilMinute(date, plan.dueTime, template.timezone);
    const window = reason ? null : civilDayWindow(date, template.timezone);
    if (!reason && (!due || !window)) {
      reason = "CLOCK_GAP";
    }
    const result: ChecklistOccurrence = {
      id: occurrenceId(scope.tenantId, scope.workspaceId, template.id, date),
      templateId: template.id,
      localDate: date,
      templateVersion: plan.version,
      state: "SKIPPED",
      reason,
      taskIds: [],
      skippedAssignees: [],
      createdAt: now,
    };
    if (!reason && due && window) {
      for (const staffId of plan.assigneeIds) {
        const owner = await this.staff.get(scope, staffId, tx);
        if (!owner || owner.archivedAt) {
          result.skippedAssignees.push({ staffId, reason: "INACTIVE" });
          continue;
        }
        if (!(await this.workdays.isAvailable(scope, staffId, window.from, window.to, tx))) {
          result.skippedAssignees.push({ staffId, reason: "NOT_AVAILABLE" });
          continue;
        }
        const id = occurrenceId(scope.tenantId, scope.workspaceId, template.id, date, staffId);
        if (await this.tasks.get(scope, id, tx)) {
          throw new ConflictException("Occurrence task ID is already occupied");
        }
        await persistTaskMutation(
          { repo: this.tasks, audit: this.audit, outbox: this.outbox },
          scope,
          {
            id,
            workspaceId: scope.workspaceId,
            title: plan.title,
            ownerStaffId: staffId,
            ownerName: owner.displayName,
            dueAt: due.toISOString(),
            status: "OPEN",
            version: 1,
            createdAt: now,
            updatedAt: now,
            completedAt: null,
            checklist: plan.steps.map((step) => ({ ...step, completed: false })),
            recurrence: {
              templateId: template.id,
              templateVersion: plan.version,
              localDate: date,
              checklistTitle: plan.title,
              timezone: template.timezone,
            },
          },
          "create",
          ctx,
          tx
        );
        result.taskIds.push(id);
      }
      result.state = result.taskIds.length ? "GENERATED" : "SKIPPED";
      result.reason = result.taskIds.length ? null : "NO_ELIGIBLE_ASSIGNEES";
    }
    await this.templates.saveOccurrence(scope, result, tx);
    await this.audit.log(
      {
        tenantId: scope.tenantId,
        userId: ctx.userId ?? "",
        action: "tasks.checklist.materialize",
        entityType: "ChecklistOccurrence",
        entityId: result.id,
        metadata: {
          workspaceId: scope.workspaceId,
          templateId: template.id,
          templateVersion: plan.version,
          localDate: date,
          generatedCount: result.taskIds.length,
          skippedCount: result.skippedAssignees.length,
          reason: result.reason,
          trigger: manual ? "MANUAL" : "PUBLISHED_POLICY",
        },
      },
      tx
    );
    await this.outbox.enqueue(
      {
        tenantId: scope.tenantId,
        eventType: "tasks.checklist.materialize",
        payload: {
          workspaceId: scope.workspaceId,
          templateId: template.id,
          version: plan.version,
          localDate: date,
          occurrenceId: result.id,
        },
        correlationId: ctx.correlationId,
      },
      tx
    );
    return result;
  }
}
