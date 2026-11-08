import type { PersonnelAttachment, PersonnelAttachmentOwner } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
export interface PersonnelDocumentsPort {
  list(owner: PersonnelAttachmentOwner, tx: TransactionContext): Promise<PersonnelAttachment[]>;
  upload(
    owner: PersonnelAttachmentOwner,
    input: { filename: string; contentType: string; bytes: Buffer },
    tx: TransactionContext
  ): Promise<PersonnelAttachment>;
  download(
    owner: PersonnelAttachmentOwner,
    documentId: string,
    tx: TransactionContext
  ): Promise<{ attachment: PersonnelAttachment; bytes: Buffer }>;
}
export const PERSONNEL_DOCUMENTS = Symbol("PERSONNEL_DOCUMENTS");
