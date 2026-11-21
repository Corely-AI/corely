import type { SignDraft, SignDraftSummary, SignPublication } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";

export type SignScope = { tenantId: string; workspaceId: string };
export type DraftEntry = SignDraft & { actorId: string; commandId: string; fingerprint: string };
export abstract class SignDraftRepository {
  abstract publication(
    scope: SignScope,
    id: string,
    revision: number,
    tx?: TransactionContext
  ): Promise<SignPublication | null>;
  abstract publish(
    scope: SignScope,
    record: SignPublication,
    actorId: string,
    tx: TransactionContext
  ): Promise<void>;
  abstract list(scope: SignScope, cursor: string | null): Promise<SignDraftSummary[]>;
  abstract version(
    scope: SignScope,
    id: string,
    revision: number,
    tx?: TransactionContext
  ): Promise<SignDraft | null>;
  abstract latest(scope: SignScope, id: string, tx?: TransactionContext): Promise<SignDraft | null>;
  abstract lock(scope: SignScope, id: string, tx: TransactionContext): Promise<void>;
  abstract replay(
    scope: SignScope,
    id: string,
    actor: string,
    command: string,
    tx: TransactionContext
  ): Promise<DraftEntry | null>;
  abstract append(scope: SignScope, record: DraftEntry, tx: TransactionContext): Promise<void>;
}
