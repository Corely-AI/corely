import { createHash } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { ConflictError, ForbiddenError, NotFoundError } from "@corely/domain";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  type AuditPort,
  type OutboxPort,
  type UnitOfWorkPort,
  type UseCaseContext,
} from "@corely/kernel";
import type { SubmitServiceRequest, SendClientUpdate } from "@corely/contracts";
import { ISSUE_REPORT_POLICY_REJECTED, issueReportRejection } from "@corely/issues/extensions";
import { ValidationError } from "@corely/kernel";
import { issueReportPolicies } from "../../issue-report-extensions";
import type { Issue } from "../../domain/issue.types";
import { ISSUE_REPOSITORY_PORT, type IssueRepositoryPort } from "../ports/issue-repository.port";

export const CLIENT_UPDATE_EVENT = "issue.client-update.requested";
// Resend idempotency keys expire after 24 hours. Leave margin for delivery.
export const CLIENT_UPDATE_RETRY_MS = 23 * 60 * 60 * 1000;

function requireWorkspace(ctx: UseCaseContext) {
  if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
    throw new ForbiddenError("A workspace and signed-in user are required");
  }
  return { tenantId: ctx.tenantId, workspaceId: ctx.workspaceId, userId: ctx.userId };
}

@Injectable()
export class ServiceRequestsUseCase {
  constructor(
    @Inject(ISSUE_REPOSITORY_PORT) private readonly issues: IssueRepositoryPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort
  ) {}

  async submit(input: SubmitServiceRequest, ctx: UseCaseContext): Promise<Issue> {
    const { tenantId, workspaceId, userId } = requireWorkspace(ctx);
    const id = createHash("sha256")
      .update(JSON.stringify([tenantId, workspaceId, userId, input.idempotencyKey]))
      .digest("hex");
    const existing = await this.issues.findById(tenantId, id, workspaceId);
    if (existing) {return existing;}

    const rejection = issueReportRejection(issueReportPolicies, tenantId, {
      priority: "MEDIUM",
      hasDescription: true,
    });
    if (rejection) {throw new ValidationError(rejection, undefined, ISSUE_REPORT_POLICY_REJECTED);}

    const now = new Date();
    const issue: Issue = {
      id,
      tenantId,
      workspaceId,
      reporterUserId: userId,
      requestKind: input.kind,
      clientEmail: input.clientEmail ?? null,
      title: input.title,
      description: input.description,
      status: "NEW",
      priority: "MEDIUM",
      siteType: input.clientEmail ? "CUSTOMER" : "FIELD",
      createdAt: now,
      updatedAt: now,
    };
    await this.uow.withinTransaction(async (tx) => {
      if (!(await this.issues.insertRequest(issue, tx))) {return;}
      await this.audit.log(
        {
          tenantId,
          userId,
          action: "issue.created",
          entityType: "Issue",
          entityId: id,
          metadata: { workspaceId, requestKind: input.kind },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "issue.created",
          payload: {
            issueId: id,
            tenantId,
            workspaceId,
            reporterUserId: userId,
            status: issue.status,
            priority: issue.priority,
            siteType: issue.siteType,
            createdAt: now.toISOString(),
          },
        },
        tx
      );
    });

    const saved = await this.issues.findById(tenantId, id, workspaceId);
    if (!saved) {throw new NotFoundError("Request not found");}
    return saved;
  }

  async sendUpdate(id: string, input: SendClientUpdate, ctx: UseCaseContext) {
    const { tenantId, workspaceId, userId } = requireWorkspace(ctx);
    const issue = await this.issues.findById(tenantId, id, workspaceId);
    if (!issue?.requestKind || issue.workspaceId !== workspaceId) {
      throw new NotFoundError("Request not found");
    }
    if (
      input.recipient !== issue.clientEmail ||
      (issue.status !== "RESOLVED" && issue.status !== "CLOSED")
    ) {
      throw new ConflictError("Resolve the request and confirm its client contact first");
    }
    if (issue.clientUpdateStatus === "QUEUED" || issue.clientUpdateStatus === "SENT") {return;}
    const now = new Date();
    if (
      issue.clientUpdateStatus === "NEEDS_REVIEW" ||
      (issue.clientUpdateQueuedAt &&
        now.getTime() - issue.clientUpdateQueuedAt.getTime() >= CLIENT_UPDATE_RETRY_MS)
    ) {
      throw new ConflictError("Check message delivery before sending another update");
    }
    if (issue.clientUpdateSummary && issue.clientUpdateSummary !== input.summary) {
      throw new ConflictError("Retry the original completion summary");
    }
    await this.uow.withinTransaction(async (tx) => {
      if (!(await this.issues.queueClientUpdate(issue, input.summary, now, tx))) {return;}
      await this.audit.log(
        {
          tenantId,
          userId,
          action: "issue.client-update.requested",
          entityType: "Issue",
          entityId: id,
          metadata: { workspaceId },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId,
          eventType: CLIENT_UPDATE_EVENT,
          payload: { issueId: id, workspaceId },
        },
        tx
      );
    });
  }
}
