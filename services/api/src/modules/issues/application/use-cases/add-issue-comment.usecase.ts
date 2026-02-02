import { ValidationFailedError, NotFoundError } from "@corely/domain";
import type { AddIssueCommentRequest } from "@corely/contracts";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import { assertCan } from "@/shared/policies/assert-can";
import type { AuditPort } from "@/shared/ports/audit.port";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { IssueRepositoryPort } from "../ports/issue-repository.port";
import type { IssueCommentRepositoryPort } from "../ports/issue-comment-repository.port";
import type { IssueAttachmentRepositoryPort } from "../ports/issue-attachment-repository.port";
import type { IssueActivityRepositoryPort } from "../ports/issue-activity-repository.port";
import type { IssueAttachment, IssueComment } from "../../domain/issue.types";
import { assertAttachmentsValid } from "../issue-attachments";

const ACTION_KEY = "issues.add-comment";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const toStoredComment = (comment: IssueComment) => ({
  ...comment,
  createdAt: comment.createdAt.toISOString(),
});

const fromStoredComment = (stored: any): IssueComment => ({
  id: stored.id,
  tenantId: stored.tenantId,
  issueId: stored.issueId,
  body: stored.body,
  createdByUserId: stored.createdByUserId,
  createdAt: new Date(stored.createdAt),
});

@RequireTenant()
export class AddIssueCommentUseCase {
  constructor(
    private readonly issueRepo: IssueRepositoryPort,
    private readonly commentRepo: IssueCommentRepositoryPort,
    private readonly attachmentRepo: IssueAttachmentRepositoryPort,
    private readonly activityRepo: IssueActivityRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: AddIssueCommentRequest, ctx: UseCaseContext): Promise<IssueComment> {
    assertCan(ctx);
    const tenantId = ctx.tenantId!;

    if (!input.body?.trim()) {
      throw new ValidationFailedError("body is required", [
        { message: "body is required", members: ["body"] },
      ]);
    }

    const issue = await this.issueRepo.findById(tenantId, input.issueId);
    if (!issue) {
      throw new NotFoundError("Issue not found", { code: "Issues:NotFound" });
    }

    const idempotencyKey = input.idempotencyKey ?? "default";
    const cached = await this.idempotency.get(ACTION_KEY, tenantId, idempotencyKey);
    if (cached) {
      return fromStoredComment(cached.body);
    }

    const attachments = input.attachments ?? [];
    if (attachments.length) {
      assertAttachmentsValid(attachments, MAX_ATTACHMENT_BYTES);
    }

    const comment: IssueComment = {
      id: this.idGenerator.newId(),
      tenantId,
      issueId: issue.id,
      body: input.body.trim(),
      createdByUserId: ctx.userId ?? "system",
      createdAt: this.clock.now(),
    };

    const created = await this.commentRepo.create(comment);

    const preparedAttachments: IssueAttachment[] = attachments.map((attachment) => ({
      id: this.idGenerator.newId(),
      tenantId,
      issueId: issue.id,
      commentId: comment.id,
      documentId: attachment.documentId,
      kind: attachment.kind,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      durationSeconds: attachment.durationSeconds ?? null,
      transcriptText: null,
      transcriptSegments: null,
      transcriptionStatus: attachment.kind === "AUDIO" ? "PENDING" : null,
      transcriptionError: null,
      createdAt: this.clock.now(),
      createdByUserId: ctx.userId ?? null,
    }));

    await this.attachmentRepo.createMany(preparedAttachments);

    await this.activityRepo.create({
      id: this.idGenerator.newId(),
      tenantId,
      issueId: issue.id,
      type: "COMMENT_ADDED",
      metadata: { commentId: comment.id },
      createdAt: comment.createdAt,
      createdByUserId: ctx.userId ?? null,
    });

    for (const attachment of preparedAttachments) {
      await this.activityRepo.create({
        id: this.idGenerator.newId(),
        tenantId,
        issueId: issue.id,
        type: "ATTACHMENT_ADDED",
        metadata: { attachmentId: attachment.id, commentId: comment.id },
        createdAt: this.clock.now(),
        createdByUserId: ctx.userId ?? null,
      });
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "issue.comment.added",
      entityType: "Issue",
      entityId: issue.id,
      metadata: { commentId: comment.id, attachments: preparedAttachments.length },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "issue.comment.added",
      payload: {
        issueId: issue.id,
        tenantId,
        commentId: comment.id,
        createdAt: comment.createdAt.toISOString(),
        createdByUserId: comment.createdByUserId,
      },
    });

    for (const attachment of preparedAttachments.filter((item) => item.kind === "AUDIO")) {
      await this.outbox.enqueue({
        tenantId,
        eventType: "issue.transcription.requested",
        payload: {
          issueId: issue.id,
          tenantId,
          attachmentId: attachment.id,
          documentId: attachment.documentId,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          durationSeconds: attachment.durationSeconds ?? undefined,
          requestedAt: this.clock.now().toISOString(),
          requestedByUserId: ctx.userId ?? null,
          commentId: comment.id,
        },
      });
    }

    await this.idempotency.store(ACTION_KEY, tenantId, idempotencyKey, {
      body: toStoredComment(created),
    });

    return created;
  }
}
