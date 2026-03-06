import { type PrismaService } from "@corely/data";
import type {
  ApplyTranscriptionResult,
  IssueTranscriptionRepositoryPort,
} from "../ports/issue-transcription-repository.port";

const serializeSegments = (
  segments?: Array<{ startSeconds: number; endSeconds: number; text: string }>
) => (segments ? JSON.stringify(segments) : null);

export class PrismaIssueTranscriptionRepositoryAdapter implements IssueTranscriptionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async applyTranscription(params: {
    tenantId: string;
    issueId: string;
    attachmentId: string;
    transcriptText: string;
    transcriptSegments?: Array<{ startSeconds: number; endSeconds: number; text: string }>;
    commentId?: string | null;
  }): Promise<ApplyTranscriptionResult> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      await tx.issueAttachment.update({
        where: { id: params.attachmentId, tenantId: params.tenantId },
        data: {
          transcriptText: params.transcriptText,
          transcriptSegmentsJson: serializeSegments(params.transcriptSegments),
          transcriptionStatus: "COMPLETED",
          transcriptionError: null,
        },
      });

      const issue = await tx.issue.findUnique({
        where: { id: params.issueId, tenantId: params.tenantId },
      });

      let commentId: string | null = null;
      let issueDescriptionUpdated = false;

      if (issue && (!issue.description || issue.description.trim() === "")) {
        await tx.issue.update({
          where: { id: params.issueId, tenantId: params.tenantId },
          data: { description: params.transcriptText, updatedAt: now },
        });
        issueDescriptionUpdated = true;
      } else {
        const comment = await tx.issueComment.create({
          data: {
            tenantId: params.tenantId,
            issueId: params.issueId,
            body: params.transcriptText,
            createdByUserId: "system",
            createdAt: now,
          },
        });
        commentId = comment.id;

        await tx.issueActivity.create({
          data: {
            tenantId: params.tenantId,
            issueId: params.issueId,
            type: "COMMENT_ADDED",
            metadataJson: JSON.stringify({
              commentId: comment.id,
              transcript: true,
              segments: params.transcriptSegments?.length ?? 0,
            }),
            createdAt: now,
            createdByUserId: null,
          },
        });
      }

      return { commentId, issueDescriptionUpdated };
    });
  }

  async markFailed(params: {
    tenantId: string;
    attachmentId: string;
    errorMessage: string;
  }): Promise<void> {
    await this.prisma.issueAttachment.update({
      where: { id: params.attachmentId, tenantId: params.tenantId },
      data: {
        transcriptionStatus: "FAILED",
        transcriptionError: params.errorMessage,
      },
    });
  }
}
