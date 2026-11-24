import { Inject, Injectable } from "@nestjs/common";
import type { EmailSenderPort } from "@corely/kernel";
import { ISSUE_REPOSITORY_PORT, type IssueRepositoryPort } from "../ports/issue-repository.port";
import { CLIENT_UPDATE_RETRY_MS } from "./service-requests.usecase";

@Injectable()
export class DeliverClientUpdateUseCase {
  constructor(@Inject(ISSUE_REPOSITORY_PORT) private readonly issues: IssueRepositoryPort) {}

  async execute(tenantId: string, workspaceId: string, id: string, sender: EmailSenderPort) {
    const issue = await this.issues.findById(tenantId, id, workspaceId);
    if (issue?.workspaceId !== workspaceId || issue.clientUpdateStatus !== "QUEUED") {return;}

    if (
      !issue.clientEmail ||
      !issue.clientUpdateSummary ||
      !issue.clientUpdateQueuedAt ||
      Date.now() - issue.clientUpdateQueuedAt.getTime() >= CLIENT_UPDATE_RETRY_MS
    ) {
      await this.issues.finishClientUpdate(issue, "NEEDS_REVIEW");
      return;
    }

    if (issue.status !== "RESOLVED" && issue.status !== "CLOSED") {
      await this.issues.finishClientUpdate(issue, "FAILED");
      return;
    }

    try {
      await sender.sendEmail({
        tenantId,
        to: [issue.clientEmail],
        subject: "Service request completed",
        text: issue.clientUpdateSummary,
        idempotencyKey: "issue-client-update/" + issue.id,
      });
    } catch {
      await this.issues.finishClientUpdate(issue, "FAILED");
      return;
    }
    await this.issues.finishClientUpdate(issue, "SENT");
  }
}
