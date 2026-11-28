import type { TaskAttachment } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export interface TaskAttachmentScope {
  tenantId: string;
  workspaceId: string;
  taskId: string;
}

export interface TaskAttachmentsPort {
  upload(
    scope: TaskAttachmentScope,
    input: { filename: string; contentType: TaskAttachment["contentType"]; bytes: Buffer },
    tx: TransactionContext
  ): Promise<TaskAttachment>;
  download(scope: TaskAttachmentScope, documentId: string): Promise<Buffer | null>;
}

export const TASK_ATTACHMENTS = Symbol("TASK_ATTACHMENTS");
