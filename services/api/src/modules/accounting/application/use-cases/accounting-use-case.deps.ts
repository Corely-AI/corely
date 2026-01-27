import type { ClockPort, IdGeneratorPort, LoggerPort } from "@corely/kernel";
import type {
  AccountingSettingsRepoPort,
  LedgerAccountRepoPort,
  JournalEntryRepoPort,
  AccountingPeriodRepoPort,
} from "../ports/accounting-repository.port";

export type BaseDeps = {
  logger: LoggerPort;
  settingsRepo: AccountingSettingsRepoPort;
  accountRepo: LedgerAccountRepoPort;
  entryRepo: JournalEntryRepoPort;
  periodRepo: AccountingPeriodRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};
