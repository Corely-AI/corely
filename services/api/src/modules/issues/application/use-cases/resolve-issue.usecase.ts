import { NotFoundError } from "@corely/domain";
import type { ResolveIssueRequest } from "@corely/contracts";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import { assertCan } from "@/shared/policies/assert-can";
import type { AuditPort } from "@/shared/ports/audit.port";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import type { IssueRepositoryPort } from "../ports/issue-repository.port";
import type { IssueActivityRepositoryPort } from "../ports/issue-activity-repository.port";
import { assertIssueStatusTransition } from "../../domain/issue.rules";
import { assertReporterCanResolve } from "../../policies/issues.policies";
import type { Issue } from "../../domain/issue.types";

const ACTION_KEY = "issues.resolve";

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
export class ResolveIssueUseCase {
  constructor(
    private readonly issueRepo: IssueRepositoryPort,
    private readonly activityRepo: IssueActivityRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly clock: ClockPort,
    private readonly idGenerator: IdGeneratorPort
  ) {}

  async execute(input: ResolveIssueRequest, ctx: UseCaseContext): Promise<Issue> {
    assertCan(ctx);
    const tenantId = ctx.tenantId!;

    const issue = await this.issueRepo.findById(tenantId, input.issueId);
    if (!issue) {
      throw new NotFoundError("Issue not found", { code: "Issues:NotFound" });
    }

    assertReporterCanResolve(issue, ctx);

    const idempotencyKey = input.idempotencyKey ?? "default";
    const cached = await this.idempotency.get(ACTION_KEY, tenantId, idempotencyKey);
    if (cached) {
      return fromStoredIssue(cached.body);
    }

    if (issue.status !== "RESOLVED") {
      assertIssueStatusTransition(issue.status, "RESOLVED");
    }

    const now = this.clock.now();
    const updated = await this.issueRepo.update(tenantId, issue.id, {
      status: "RESOLVED",
      resolvedAt: now,
      resolvedByUserId: ctx.userId ?? null,
      updatedAt: now,
    });

    await this.activityRepo.create({
      id: this.idGenerator.newId(),
      tenantId,
      issueId: issue.id,
      type: "RESOLVED",
      metadata: { note: input.resolutionNote ?? null },
      createdAt: now,
      createdByUserId: ctx.userId ?? null,
    });

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "issue.resolved",
      entityType: "Issue",
      entityId: issue.id,
      metadata: { note: input.resolutionNote ?? null },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "issue.resolved",
      payload: {
        issueId: issue.id,
        tenantId,
        resolvedAt: now.toISOString(),
        resolvedByUserId: ctx.userId ?? null,
      },
    });

    await this.idempotency.store(ACTION_KEY, tenantId, idempotencyKey, {
      body: toStoredIssue(updated),
    });

    return updated;
  }
}
