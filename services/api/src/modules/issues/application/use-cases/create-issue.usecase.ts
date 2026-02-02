import { ValidationFailedError } from "@corely/domain";
import type {
  AttachmentMetadata,
  CreateIssueRequest,
  IssueTranscriptionSegment,
} from "@corely/contracts";
import type { OutboxPort, UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import { assertCan } from "@/shared/policies/assert-can";
import type { AuditPort } from "@/shared/ports/audit.port";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { IssueRepositoryPort } from "../ports/issue-repository.port";
import type { IssueAttachmentRepositoryPort } from "../ports/issue-attachment-repository.port";
import type { IssueActivityRepositoryPort } from "../ports/issue-activity-repository.port";
import type { IssueCommentRepositoryPort } from "../ports/issue-comment-repository.port";
import type { DocumentsPort } from "../ports/documents.port";
import type { SpeechToTextPort } from "../ports/speech-to-text.port";
import type {
  Issue,
  IssueAttachment,
  IssueComment,
  IssueTranscriptionStatus,
} from "../../domain/issue.types";
import { assertAttachmentsValid } from "../issue-attachments";

const ACTION_KEY = "issues.create";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_SYNC_TRANSCRIPTION_BYTES = 5 * 1024 * 1024; // 5MB

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
export class CreateIssueUseCase {
  constructor(
    private readonly issueRepo: IssueRepositoryPort,
    private readonly attachmentRepo: IssueAttachmentRepositoryPort,
    private readonly activityRepo: IssueActivityRepositoryPort,
    private readonly commentRepo: IssueCommentRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly documents: DocumentsPort,
    private readonly speechToText: SpeechToTextPort
  ) {}

  async execute(input: CreateIssueRequest, ctx: UseCaseContext): Promise<Issue> {
    assertCan(ctx);
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new ValidationFailedError("tenantId is required", [
        { message: "tenantId is required", members: ["tenantId"] },
      ]);
    }

    if (!input.title?.trim()) {
      throw new ValidationFailedError("title is required", [
        { message: "title is required", members: ["title"] },
      ]);
    }

    const idempotencyKey = input.idempotencyKey ?? "default";
    const cached = await this.idempotency.get(ACTION_KEY, tenantId, idempotencyKey);
    if (cached) {
      return fromStoredIssue(cached.body);
    }

    const attachments = input.attachments ?? [];
    if (attachments.length) {
      assertAttachmentsValid(attachments, MAX_ATTACHMENT_BYTES);
    }

    const now = this.clock.now();
    const issue: Issue = {
      id: this.idGenerator.newId(),
      tenantId,
      title: input.title.trim(),
      description: input.description ?? null,
      status: "NEW",
      priority: input.priority ?? "MEDIUM",
      siteType: input.siteType,
      siteId: input.siteId ?? null,
      customerPartyId: input.customerPartyId ?? null,
      manufacturerPartyId: input.manufacturerPartyId ?? null,
      assigneeUserId: null,
      reporterUserId: ctx.userId ?? null,
      resolvedAt: null,
      resolvedByUserId: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const preparedAttachments = attachments.map((attachment) =>
      this.buildAttachment(tenantId, issue.id, attachment, ctx.userId, input.voiceNoteTranscript)
    );

    const createdIssue = await this.issueRepo.create(issue);
    await this.attachmentRepo.createMany(preparedAttachments);

    await this.activityRepo.create({
      id: this.idGenerator.newId(),
      tenantId,
      issueId: issue.id,
      type: "CREATED",
      metadata: { title: issue.title },
      createdAt: now,
      createdByUserId: ctx.userId ?? null,
    });

    for (const attachment of preparedAttachments) {
      await this.activityRepo.create({
        id: this.idGenerator.newId(),
        tenantId,
        issueId: issue.id,
        type: "ATTACHMENT_ADDED",
        metadata: { attachmentId: attachment.id, documentId: attachment.documentId },
        createdAt: now,
        createdByUserId: ctx.userId ?? null,
      });
    }

    await this.audit.log({
      tenantId,
      userId: ctx.userId ?? "system",
      action: "issue.created",
      entityType: "Issue",
      entityId: issue.id,
      metadata: { attachments: preparedAttachments.length },
    });

    await this.outbox.enqueue({
      tenantId,
      eventType: "issue.created",
      payload: {
        issueId: issue.id,
        tenantId,
        status: issue.status,
        priority: issue.priority,
        siteType: issue.siteType,
        createdAt: now.toISOString(),
        reporterUserId: ctx.userId ?? null,
      },
    });

    await this.handleTranscription(
      issue,
      preparedAttachments,
      input.voiceNoteTranscript ?? null,
      ctx
    );

    const refreshedIssue = await this.issueRepo.findById(tenantId, issue.id);
    const finalIssue = refreshedIssue ?? createdIssue;

    await this.idempotency.store(ACTION_KEY, tenantId, idempotencyKey, {
      body: toStoredIssue(finalIssue),
    });

    return finalIssue;
  }

  private buildAttachment(
    tenantId: string,
    issueId: string,
    attachment: AttachmentMetadata,
    userId: string | undefined,
    transcript?: string | null
  ): IssueAttachment {
    const transcriptText = attachment.kind === "AUDIO" ? (transcript ?? null) : null;
    const transcriptionStatus: IssueTranscriptionStatus | null =
      attachment.kind === "AUDIO" ? (transcriptText ? "COMPLETED" : "PENDING") : null;

    return {
      id: this.idGenerator.newId(),
      tenantId,
      issueId,
      commentId: null,
      documentId: attachment.documentId,
      kind: attachment.kind,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      durationSeconds: attachment.durationSeconds ?? null,
      transcriptText,
      transcriptSegments: null,
      transcriptionStatus,
      transcriptionError: null,
      createdAt: this.clock.now(),
      createdByUserId: userId ?? null,
    };
  }

  private async handleTranscription(
    issue: Issue,
    attachments: IssueAttachment[],
    transcriptHint: string | null,
    ctx: UseCaseContext
  ) {
    const audioAttachments = attachments.filter((attachment) => attachment.kind === "AUDIO");
    if (!audioAttachments.length) {
      return;
    }

    if (transcriptHint) {
      await this.maybeApplyTranscript(issue, transcriptHint, [], ctx);
      return;
    }

    for (const attachment of audioAttachments) {
      const shouldSync = attachment.sizeBytes <= MAX_SYNC_TRANSCRIPTION_BYTES;
      if (shouldSync) {
        try {
          const { buffer, contentType } = await this.documents.getDocumentBuffer({
            tenantId: issue.tenantId,
            documentId: attachment.documentId,
          });
          const result = await this.speechToText.transcribe({
            bytes: buffer,
            contentType,
            language: "vi",
          });

          await this.attachmentRepo.update(issue.tenantId, attachment.id, {
            transcriptText: result.text,
            transcriptSegments: (result.segments ?? []) as IssueTranscriptionSegment[],
            transcriptionStatus: "COMPLETED",
          });

          await this.maybeApplyTranscript(issue, result.text, result.segments ?? [], ctx);

          await this.outbox.enqueue({
            tenantId: issue.tenantId,
            eventType: "issue.transcription.completed",
            payload: {
              issueId: issue.id,
              tenantId: issue.tenantId,
              attachmentId: attachment.id,
              transcriptText: result.text,
              transcriptSegments: result.segments ?? null,
              completedAt: this.clock.now().toISOString(),
            },
          });

          continue;
        } catch (error) {
          const message = error instanceof Error ? error.message : "transcription failed";
          await this.attachmentRepo.update(issue.tenantId, attachment.id, {
            transcriptionStatus: "FAILED",
            transcriptionError: message,
          });
        }
      }

      await this.outbox.enqueue({
        tenantId: issue.tenantId,
        eventType: "issue.transcription.requested",
        payload: {
          issueId: issue.id,
          tenantId: issue.tenantId,
          attachmentId: attachment.id,
          documentId: attachment.documentId,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          durationSeconds: attachment.durationSeconds ?? undefined,
          requestedAt: this.clock.now().toISOString(),
          requestedByUserId: ctx.userId ?? null,
        },
      });
    }
  }

  private async maybeApplyTranscript(
    issue: Issue,
    transcriptText: string,
    transcriptSegments: IssueTranscriptionSegment[],
    ctx: UseCaseContext
  ) {
    if (!transcriptText.trim()) {
      return;
    }

    if (!issue.description) {
      await this.issueRepo.update(issue.tenantId, issue.id, {
        description: transcriptText,
        updatedAt: this.clock.now(),
      });
      return;
    }

    const comment: IssueComment = {
      id: this.idGenerator.newId(),
      tenantId: issue.tenantId,
      issueId: issue.id,
      body: transcriptText,
      createdByUserId: "system",
      createdAt: this.clock.now(),
    };

    await this.commentRepo.create(comment);
    await this.activityRepo.create({
      id: this.idGenerator.newId(),
      tenantId: issue.tenantId,
      issueId: issue.id,
      type: "COMMENT_ADDED",
      metadata: { commentId: comment.id, transcript: true, segments: transcriptSegments.length },
      createdAt: comment.createdAt,
      createdByUserId: ctx.userId ?? null,
    });

    await this.outbox.enqueue({
      tenantId: issue.tenantId,
      eventType: "issue.comment.added",
      payload: {
        issueId: issue.id,
        tenantId: issue.tenantId,
        commentId: comment.id,
        createdAt: comment.createdAt.toISOString(),
        createdByUserId: comment.createdByUserId,
      },
    });
  }
}
