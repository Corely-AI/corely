import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { IssueAttachment, IssueTranscriptionSegment } from "../../domain/issue.types";
import type { IssueAttachmentRepositoryPort } from "../../application/ports/issue-attachment-repository.port";

const parseSegments = (value: string | null): IssueTranscriptionSegment[] | null => {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as IssueTranscriptionSegment[]) : null;
  } catch {
    return null;
  }
};

const toIssueAttachment = (row: any): IssueAttachment => ({
  id: row.id,
  tenantId: row.tenantId,
  issueId: row.issueId,
  commentId: row.commentId,
  documentId: row.documentId,
  kind: row.kind,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  durationSeconds: row.durationSeconds,
  transcriptText: row.transcriptText,
  transcriptSegments: parseSegments(row.transcriptSegmentsJson),
  transcriptionStatus: row.transcriptionStatus,
  transcriptionError: row.transcriptionError,
  createdAt: row.createdAt,
  createdByUserId: row.createdByUserId,
});

const serializeSegments = (segments?: IssueTranscriptionSegment[] | null) =>
  segments ? JSON.stringify(segments) : null;

@Injectable()
export class PrismaIssueAttachmentRepositoryAdapter implements IssueAttachmentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(attachments: IssueAttachment[]): Promise<void> {
    if (!attachments.length) {
      return;
    }

    await this.prisma.issueAttachment.createMany({
      data: attachments.map((attachment) => ({
        id: attachment.id,
        tenantId: attachment.tenantId,
        issueId: attachment.issueId,
        commentId: attachment.commentId ?? null,
        documentId: attachment.documentId,
        kind: attachment.kind,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        durationSeconds: attachment.durationSeconds ?? null,
        transcriptText: attachment.transcriptText ?? null,
        transcriptSegmentsJson: serializeSegments(attachment.transcriptSegments),
        transcriptionStatus: attachment.transcriptionStatus ?? null,
        transcriptionError: attachment.transcriptionError ?? null,
        createdAt: attachment.createdAt,
        createdByUserId: attachment.createdByUserId ?? null,
      })),
    });
  }

  async listByIssue(tenantId: string, issueId: string): Promise<IssueAttachment[]> {
    const rows = await this.prisma.issueAttachment.findMany({
      where: { tenantId, issueId },
      orderBy: { createdAt: "asc" },
    });

    if (!rows.length) {
      return [];
    }

    const documentIds = [...new Set(rows.map((r: any) => r.documentId))] as string[];
    const files = await this.prisma.file.findMany({
      where: {
        tenantId,
        documentId: { in: documentIds },
      },
      select: {
        id: true,
        documentId: true,
      },
      distinct: ["documentId"], // Assuming one primary file per document in this context
    });

    const fileMap = new Map(files.map((f) => [f.documentId, f.id]));

    return rows.map((row) => ({
      ...toIssueAttachment(row),
      fileId: fileMap.get(row.documentId),
    }));
  }

  async listByComment(tenantId: string, commentId: string): Promise<IssueAttachment[]> {
    const rows = await this.prisma.issueAttachment.findMany({
      where: { tenantId, commentId },
      orderBy: { createdAt: "asc" },
    });

    if (!rows.length) {
      return [];
    }

    const documentIds = [...new Set(rows.map((r: any) => r.documentId))] as string[];
    const files = await this.prisma.file.findMany({
      where: {
        tenantId,
        documentId: { in: documentIds },
      },
      select: {
        id: true,
        documentId: true,
      },
      distinct: ["documentId"],
    });

    const fileMap = new Map(files.map((f) => [f.documentId, f.id]));

    return rows.map((row) => ({
      ...toIssueAttachment(row),
      fileId: fileMap.get(row.documentId),
    }));
  }

  async update(
    tenantId: string,
    attachmentId: string,
    updates: Partial<IssueAttachment>
  ): Promise<void> {
    await this.prisma.issueAttachment.update({
      where: { id: attachmentId, tenantId },
      data: {
        transcriptText: updates.transcriptText ?? undefined,
        transcriptSegmentsJson: updates.transcriptSegments
          ? serializeSegments(updates.transcriptSegments)
          : undefined,
        transcriptionStatus: updates.transcriptionStatus ?? undefined,
        transcriptionError: updates.transcriptionError ?? undefined,
      },
    });
  }
}
