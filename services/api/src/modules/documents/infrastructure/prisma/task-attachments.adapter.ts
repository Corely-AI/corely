import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PrismaService } from "@corely/data";
import { TASK_CONTEXT_DOCUMENT_PREFIX } from "@corely/domain";
import type { ObjectStoragePort, TransactionContext } from "@corely/kernel";
import { GcsObjectStorageAdapter } from "@corely/storage";
import type { TaskAttachment } from "@corely/contracts";
import type {
  TaskAttachmentsPort,
  TaskAttachmentScope,
} from "../../application/ports/task-attachments.port";
import { PrivateEmailOriginalsAdapter } from "./private-email-originals.adapter";

const contextPath = "task-attachments";

@Injectable()
export class TaskAttachmentsAdapter implements TaskAttachmentsPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly originals: PrivateEmailOriginalsAdapter,
    @Inject(GcsObjectStorageAdapter) private readonly storage: ObjectStoragePort,
    private readonly env: EnvService
  ) {}

  async upload(
    scope: TaskAttachmentScope,
    input: { filename: string; contentType: TaskAttachment["contentType"]; bytes: Buffer },
    tx: TransactionContext
  ): Promise<TaskAttachment> {
    const documentId = TASK_CONTEXT_DOCUMENT_PREFIX + randomUUID();
    const owner = { tenantId: scope.tenantId, workspaceId: scope.workspaceId, id: scope.taskId };
    const staged = await this.originals.stage(owner, input, contextPath);
    await this.originals.register(owner, staged, tx, documentId);
    return {
      documentId,
      filename: input.filename,
      contentType: input.contentType,
      sizeBytes: staged.sizeBytes,
      createdAt: new Date().toISOString(),
    };
  }

  async download(scope: TaskAttachmentScope, documentId: string) {
    if (!documentId.startsWith(TASK_CONTEXT_DOCUMENT_PREFIX)) {
      return null;
    }
    const prefix = this.env.STORAGE_KEY_PREFIX ? this.env.STORAGE_KEY_PREFIX + "/" : "";
    const root = `${prefix}tenant/${scope.tenantId}/workspaces/${scope.workspaceId}/${contextPath}/${scope.taskId}/`;
    const file = await this.prisma.file.findFirst({
      where: {
        tenantId: scope.tenantId,
        documentId,
        kind: "ORIGINAL",
        isPublic: false,
        objectKey: { startsWith: root },
        document: { archivedAt: null },
      },
      select: { objectKey: true },
    });
    return file
      ? this.storage.getObject({ tenantId: scope.tenantId, objectKey: file.objectKey })
      : null;
  }
}
