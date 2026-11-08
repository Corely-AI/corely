import type { AuditPort, OutboxPort, TransactionContext, UseCaseContext } from "@corely/kernel";
import type { TaskRecord } from "../domain/task-rules";
import type { TaskRepositoryPort, TaskScope } from "./ports/task-repository.port";
export async function persistTaskMutation(
  ports: { repo: TaskRepositoryPort; audit: AuditPort; outbox: OutboxPort },
  scope: TaskScope,
  task: TaskRecord,
  kind: "create" | "update" | "complete" | "reopen" | "checklist",
  ctx: UseCaseContext,
  tx: TransactionContext
) {
  await ports.repo.save(scope, task, tx);
  await ports.audit.log(
    {
      tenantId: scope.tenantId,
      userId: ctx.userId ?? "",
      action: `tasks.task.${kind}`,
      entityType: "EmployeeTask",
      entityId: task.id,
      metadata: {
        workspaceId: scope.workspaceId,
        version: task.version,
        ownerStaffId: task.ownerStaffId,
        ...(task.recurrence
          ? { templateId: task.recurrence.templateId, localDate: task.recurrence.localDate }
          : {}),
      },
    },
    tx
  );
  await ports.outbox.enqueue(
    {
      tenantId: scope.tenantId,
      eventType: `tasks.task.${kind}`,
      payload: { workspaceId: scope.workspaceId, taskId: task.id, version: task.version },
      correlationId: ctx.correlationId,
    },
    tx
  );
}
