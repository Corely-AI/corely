import type { StaffAbsence, StaffLinkScope } from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
export interface AbsenceReplay {
  fingerprint: string;
  absenceId: string;
  documentId?: string;
}
export interface StaffAbsenceRepository {
  list(scope: StaffLinkScope, staffId: string, tx?: TransactionContext): Promise<StaffAbsence[]>;
  get(scope: StaffLinkScope, id: string, tx?: TransactionContext): Promise<StaffAbsence | null>;
  save(scope: StaffLinkScope, record: StaffAbsence, tx: TransactionContext): Promise<void>;
  replay(scope: StaffLinkScope, key: string, tx: TransactionContext): Promise<AbsenceReplay | null>;
  saveReplay(
    scope: StaffLinkScope,
    key: string,
    value: AbsenceReplay,
    tx: TransactionContext
  ): Promise<void>;
}
export const STAFF_ABSENCE_REPOSITORY = Symbol("STAFF_ABSENCE_REPOSITORY");
