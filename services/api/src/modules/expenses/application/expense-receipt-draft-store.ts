import type { ExpenseReceiptDraft } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export type ReceiptWorkspace = { tenantId: string; workspaceId: string };
export type ReceiptActor = ReceiptWorkspace & {
  userId: string;
  canReview: boolean;
  canWrite: boolean;
};

export interface ExpenseReceiptDraftStore {
  enabled(scope: ReceiptWorkspace, tx?: TransactionContext): Promise<boolean>;
  setEnabled(scope: ReceiptWorkspace, enabled: boolean, tx: TransactionContext): Promise<void>;
  userForToken(scope: ReceiptWorkspace, token: string): Promise<string | null>;
  bindToken(scope: ReceiptWorkspace, token: string, userId: string): Promise<void>;
  find(
    scope: ReceiptWorkspace,
    id: string,
    tx?: TransactionContext
  ): Promise<ExpenseReceiptDraft | null>;
  lock(
    scope: ReceiptWorkspace,
    id: string,
    tx: TransactionContext
  ): Promise<ExpenseReceiptDraft | null>;
  create(
    scope: ReceiptWorkspace,
    draft: ExpenseReceiptDraft,
    tx: TransactionContext
  ): Promise<boolean>;
  save(scope: ReceiptWorkspace, draft: ExpenseReceiptDraft, tx: TransactionContext): Promise<void>;
  list(
    actor: ReceiptActor,
    after?: string
  ): Promise<{ items: ExpenseReceiptDraft[]; nextCursor: string | null }>;
}
