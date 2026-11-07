import type { StaffProfile, StaffPrivate, StaffLinkScope } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
export type StaffScope = StaffLinkScope;
export interface StaffReplay {
  fingerprint: string;
  staffId: string;
}
export interface StaffRepositoryPort {
  transaction<T>(scope: StaffScope, work: (tx: TransactionContext) => Promise<T>): Promise<T>;
  list(scope: StaffScope, tx?: TransactionContext): Promise<StaffProfile[]>;
  get(scope: StaffScope, id: string, tx?: TransactionContext): Promise<StaffProfile | null>;
  save(scope: StaffScope, profile: StaffProfile, tx: TransactionContext): Promise<void>;
  privateGet(scope: StaffScope, id: string, tx?: TransactionContext): Promise<StaffPrivate | null>;
  privateSave(
    scope: StaffScope,
    id: string,
    value: StaffPrivate,
    tx: TransactionContext
  ): Promise<void>;
  replay(scope: StaffScope, key: string, tx: TransactionContext): Promise<StaffReplay | null>;
  saveReplay(
    scope: StaffScope,
    key: string,
    replay: StaffReplay,
    tx: TransactionContext
  ): Promise<void>;
}
export const STAFF_REPOSITORY = Symbol("STAFF_REPOSITORY");
export const STAFF_ACCOUNT_LOOKUP = Symbol("STAFF_ACCOUNT_LOOKUP");
export const STAFF_PARTY_LOOKUP = Symbol("STAFF_PARTY_LOOKUP");
export const STAFF_RESOURCE_LOOKUP = Symbol("STAFF_RESOURCE_LOOKUP");
