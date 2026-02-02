import { IssueTranscriptionRequestedEventSchema } from "@corely/contracts";
import { type OutboxRepository } from "@corely/data";
import type { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";
import type { DocumentsPort } from "./ports/documents.port";
import type { SpeechToTextPort } from "./ports/speech-to-text.port";
import type { IssueTranscriptionRepositoryPort } from "./ports/issue-transcription-repository.port";

export class IssueTranscriptionRequestedHandler implements EventHandler {
  readonly eventType = "issue.transcription.requested";

  constructor(
    private readonly documents: DocumentsPort,
    private readonly speechToText: SpeechToTextPort,
    private readonly repo: IssueTranscriptionRepositoryPort,
    private readonly outbox: OutboxRepository
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = IssueTranscriptionRequestedEventSchema.parse(event.payload);

    try {
      const { buffer, contentType } = await this.documents.getAudioBuffer({
        tenantId: payload.tenantId,
        documentId: payload.documentId,
      });

      const result = await this.speechToText.transcribe({
        bytes: buffer,
        contentType,
        language: "vi",
      });

      const applied = await this.repo.applyTranscription({
        tenantId: payload.tenantId,
        issueId: payload.issueId,
        attachmentId: payload.attachmentId,
        transcriptText: result.text,
        transcriptSegments: result.segments,
        commentId: payload.commentId ?? null,
      });

      await this.outbox.enqueue({
        tenantId: payload.tenantId,
        eventType: "issue.transcription.completed",
        payload: {
          issueId: payload.issueId,
          tenantId: payload.tenantId,
          attachmentId: payload.attachmentId,
          transcriptText: result.text,
          transcriptSegments: result.segments ?? null,
          completedAt: new Date().toISOString(),
          commentId: payload.commentId ?? null,
        },
      });

      if (applied.commentId) {
        await this.outbox.enqueue({
          tenantId: payload.tenantId,
          eventType: "issue.comment.added",
          payload: {
            issueId: payload.issueId,
            tenantId: payload.tenantId,
            commentId: applied.commentId,
            createdAt: new Date().toISOString(),
            createdByUserId: "system",
          },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "transcription failed";
      await this.repo.markFailed({
        tenantId: payload.tenantId,
        attachmentId: payload.attachmentId,
        errorMessage: message,
      });
      throw error;
    }
  }
}
