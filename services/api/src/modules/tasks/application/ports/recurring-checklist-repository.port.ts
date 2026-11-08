import type { TransactionContext } from "@corely/kernel";
import type { ChecklistOccurrence } from "@corely/contracts";
import type { ChecklistRecord } from "../../domain/recurring-checklist";
import type { TaskScope } from "./task-repository.port";
export interface RecurringChecklistRepository {
  get(scope: TaskScope, id: string, tx?: TransactionContext): Promise<ChecklistRecord | null>;
  list(scope: TaskScope, tx?: TransactionContext): Promise<ChecklistRecord[]>;
  save(scope: TaskScope, template: ChecklistRecord, tx: TransactionContext): Promise<void>;
  occurrence(
    scope: TaskScope,
    templateId: string,
    date: string,
    tx: TransactionContext
  ): Promise<ChecklistOccurrence | null>;
  saveOccurrence(
    scope: TaskScope,
    occurrence: ChecklistOccurrence,
    tx: TransactionContext
  ): Promise<void>;
  recent(
    scope: TaskScope,
    templateId: string,
    tx?: TransactionContext
  ): Promise<ChecklistOccurrence[]>;
  replay(
    scope: TaskScope,
    key: string,
    tx: TransactionContext
  ): Promise<{ fingerprint: string; templateId: string } | null>;
  saveReplay(
    scope: TaskScope,
    key: string,
    value: { fingerprint: string; templateId: string },
    tx: TransactionContext
  ): Promise<void>;
  due(now: Date, limit: number): Promise<Array<{ scope: TaskScope; id: string }>>;
}
export const RECURRING_CHECKLIST_REPOSITORY = Symbol("RECURRING_CHECKLIST_REPOSITORY");
