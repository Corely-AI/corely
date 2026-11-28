import { randomUUID } from "node:crypto";
import { NotFoundError, ValidationFailedError } from "@corely/domain";
import type { AssignIssueRequest } from "@corely/contracts";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import { assertCan } from "@/shared/policies/assert-can";
import type { AuditPort } from "@/shared/ports/audit.port";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import type { IssueRepositoryPort } from "../ports/issue-repository.port";
import type { IssueActivityRepositoryPort } from "../ports/issue-activity-repository.port";
import { assertLeadCanAssign } from "../../policies/issues.policies";
import type { Issue } from "../../domain/issue.types";

const ACTION_KEY = "issues.assign";

const toStoredIssue = (issue: Issue) => ({
  ...issue,
  createdAt: issue.createdAt.toISOString(),
  updatedAt: issue.updatedAt.toISOString(),
  resolvedAt: issue.resolvedAt?.toISOString() ?? null,
  closedAt: issue.closedAt?.toISOString() ?? null,
});

const fromStoredIssue = (stored: any): Issue => ({
  id: stored.id,
  tenantId: stored.tenantId,
  title: stored.title,
  description: stored.description ?? null,
  status: stored.status,
  priority: stored.priority,
  siteType: stored.siteType,
  siteId: stored.siteId ?? null,
  customerPartyId: stored.customerPartyId ?? null,
  manufacturerPartyId: stored.manufacturerPartyId ?? null,
  assigneeUserId: stored.assigneeUserId ?? null,
  reporterUserId: stored.reporterUserId ?? null,
  resolvedAt: stored.resolvedAt ? new Date(stored.resolvedAt) : null,
  resolvedByUserId: stored.resolvedByUserId ?? null,
  closedAt: stored.closedAt ? new Date(stored.closedAt) : null,
  createdAt: new Date(stored.createdAt),
  updatedAt: new Date(stored.updatedAt),
});

@RequireTenant()
export class AssignIssueUseCase {
  constructor(
    private readonly issueRepo: IssueRepositoryPort,
    private readonly activityRepo: IssueActivityRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(
    input: AssignIssueRequest,
    ctx: UseCaseContext,
    authorizedOperator = false
  ): Promise<Issue> {
    assertCan(ctx);
    const tenantId = ctx.tenantId!;

    if (!input.assigneeUserId) {
      throw new ValidationFailedError("assigneeUserId is required", [
        { message: "assigneeUserId is required", members: ["assigneeUserId"] },
      ]);
    }

    const issue = await this.issueRepo.findById(
      tenantId,
      input.issueId,
      ctx.workspaceId ?? undefined
    );
    if (!issue || (issue.workspaceId && !authorizedOperator)) {
      throw new NotFoundError("Issue not found", { code: "Issues:NotFound" });
    }

    if (!issue.workspaceId) {assertLeadCanAssign(ctx);}

    const key = input.idempotencyKey ?? (issue.workspaceId ? randomUUID() : "default");
    const idempotencyKey = issue.workspaceId ? JSON.stringify([issue.id, ctx.userId, key]) : key;
    const cached = await this.idempotency.get(ACTION_KEY, tenantId, idempotencyKey);
    if (cached) {
      return fromStoredIssue(cached.body);
    }

    const now = this.clock.now();
    const updated = await this.issueRepo.update(tenantId, issue.id, {
      assigneeUserId: input.assigneeUserId,
      updatedAt: now,
    });

    await this.activityRepo.create({
      id: this.idGenerator.newId(),
      tenantId,
      issueId: issue.id,
      type: "ASSIGNED",
      metadata: { assigneeUserId: input.assigneeUserId },
      createdAt: now,
      createdByUserId: ctx.userId ?? null,
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "issue.assigned",
      entityType: "Issue",
      entityId: issue.id,
      metadata: { assigneeUserId: input.assigneeUserId },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "issue.assigned",
      payload: {
        issueId: issue.id,
        tenantId,
        assigneeUserId: input.assigneeUserId,
        assignedAt: now.toISOString(),
        assignedByUserId: ctx.userId ?? null,
      },
    });

    await this.idempotency.store(ACTION_KEY, tenantId, idempotencyKey, {
      body: toStoredIssue(updated),
    });

    return updated;
  }
}
