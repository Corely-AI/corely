// Accounting Application Service Facade
import { type SetupAccountingUseCase } from "./use-cases/setup-accounting.usecase";
import { type GetSetupStatusUseCase } from "./use-cases/get-setup-status.usecase";
import { type CreateLedgerAccountUseCase } from "./use-cases/create-ledger-account.usecase";
import { type UpdateLedgerAccountUseCase } from "./use-cases/update-ledger-account.usecase";
import { type ListLedgerAccountsUseCase } from "./use-cases/list-ledger-accounts.usecase";
import { type CreateJournalEntryUseCase } from "./use-cases/create-journal-entry.usecase";
import { type UpdateJournalEntryUseCase } from "./use-cases/update-journal-entry.usecase";
import { type PostJournalEntryUseCase } from "./use-cases/post-journal-entry.usecase";
import { type ReverseJournalEntryUseCase } from "./use-cases/reverse-journal-entry.usecase";
import { type ListJournalEntriesUseCase } from "./use-cases/list-journal-entries.usecase";
import { type ClosePeriodUseCase } from "./use-cases/close-period.usecase";
import { type ReopenPeriodUseCase } from "./use-cases/reopen-period.usecase";
import { type UpdateAccountingSettingsUseCase } from "./use-cases/update-accounting-settings.usecase";
import { type GetTrialBalanceUseCase } from "./use-cases/get-trial-balance.usecase";
import { type GetGeneralLedgerUseCase } from "./use-cases/get-general-ledger.usecase";
import { type GetProfitLossUseCase } from "./use-cases/get-profit-loss.usecase";
import { type GetBalanceSheetUseCase } from "./use-cases/get-balance-sheet.usecase";

export class AccountingApplication {
  constructor(
    // Setup
    public readonly getSetupStatus: GetSetupStatusUseCase,
    public readonly setupAccounting: SetupAccountingUseCase,

    // Ledger Accounts
    public readonly createLedgerAccount: CreateLedgerAccountUseCase,
    public readonly updateLedgerAccount: UpdateLedgerAccountUseCase,
    public readonly listLedgerAccounts: ListLedgerAccountsUseCase,

    // Journal Entries
    public readonly createJournalEntry: CreateJournalEntryUseCase,
    public readonly updateJournalEntry: UpdateJournalEntryUseCase,
    public readonly postJournalEntry: PostJournalEntryUseCase,
    public readonly reverseJournalEntry: ReverseJournalEntryUseCase,
    public readonly listJournalEntries: ListJournalEntriesUseCase,

    // Reports
    public readonly getTrialBalance: GetTrialBalanceUseCase,
    public readonly getGeneralLedger: GetGeneralLedgerUseCase,
    public readonly getProfitLoss: GetProfitLossUseCase,
    public readonly getBalanceSheet: GetBalanceSheetUseCase,

    // Periods & Settings
    public readonly closePeriod: ClosePeriodUseCase,
    public readonly reopenPeriod: ReopenPeriodUseCase,
    public readonly updateSettings: UpdateAccountingSettingsUseCase
  ) {}
}
