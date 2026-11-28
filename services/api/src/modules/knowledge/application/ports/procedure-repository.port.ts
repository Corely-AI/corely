import type { PublishedProcedure } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type { ProcedureRecord } from "../../domain/procedure";

export type ProcedureScope = { tenantId: string; workspaceId: string };
export type ProcedureReplay = { fingerprint: string; procedureId: string };
export const PROCEDURE_REPOSITORY = Symbol("knowledge/procedure-repository");

export interface ProcedureRepository {
  transaction<T>(scope: ProcedureScope, work: (tx: TransactionContext) => Promise<T>): Promise<T>;
  list(scope: ProcedureScope): Promise<ProcedureRecord[]>;
  get(scope: ProcedureScope, id: string, tx?: TransactionContext): Promise<ProcedureRecord | null>;
  save(scope: ProcedureScope, record: ProcedureRecord, tx: TransactionContext): Promise<void>;
  saveVersion(
    scope: ProcedureScope,
    id: string,
    version: PublishedProcedure,
    tx: TransactionContext
  ): Promise<void>;
  getReplay(
    scope: ProcedureScope,
    key: string,
    tx: TransactionContext
  ): Promise<ProcedureReplay | null>;
  saveReplay(
    scope: ProcedureScope,
    key: string,
    replay: ProcedureReplay,
    tx: TransactionContext
  ): Promise<void>;
}
