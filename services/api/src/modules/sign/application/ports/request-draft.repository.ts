import type { TransactionContext } from "@corely/kernel";
import type {
  SignRequestFilter,
  CreateSignRequestDraft,
  SignRequestDraft,
  SignRequestDraftConfiguration,
  SignRequestSummary,
  UpdateSignRequestDraft,
} from "@corely/contracts";
import type { SignScope } from "./sign-draft.repository";
export type RequestOwner = SignScope & { actorId: string };
export abstract class RequestDraftRepository {
  abstract counts(owner: RequestOwner): Promise<{ status: string; total: number }[]>;
  abstract replay(
    owner: RequestOwner,
    commandId: string,
    tx: TransactionContext
  ): Promise<{ fingerprint: string; draft: SignRequestDraft } | null>;
  abstract list(
    owner: RequestOwner,
    after?: string,
    filters?: SignRequestFilter
  ): Promise<SignRequestSummary[]>;
  abstract get(
    owner: RequestOwner,
    id: string,
    tx?: TransactionContext
  ): Promise<SignRequestDraft | null>;
  abstract create(
    owner: RequestOwner,
    id: string,
    commandId: string,
    fingerprint: string,
    input: CreateSignRequestDraft,
    tx: TransactionContext,
    replacement?: { requestId: string; configuration: SignRequestDraftConfiguration }
  ): Promise<SignRequestDraft>;
  abstract update(
    owner: RequestOwner,
    id: string,
    input: UpdateSignRequestDraft,
    tx: TransactionContext
  ): Promise<SignRequestDraft>;
  abstract replacement(
    owner: RequestOwner,
    originalId: string,
    tx: TransactionContext
  ): Promise<SignRequestDraft | null>;
  abstract lock(owner: RequestOwner, commandId: string, tx: TransactionContext): Promise<void>;
}
