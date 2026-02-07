import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";

// Infrastructure
import {
  PrismaAccountingSettingsRepository,
  PrismaLedgerAccountRepository,
  PrismaJournalEntryRepository,
  PrismaAccountingPeriodRepository,
} from "./infrastructure/adapters/prisma-accounting-repository.adapter";
import { PrismaAccountingReportQueryAdapter } from "./infrastructure/adapters/prisma-accounting-report-query.adapter";

// Ports
import {
  ACCOUNTING_SETTINGS_REPO_PORT,
  LEDGER_ACCOUNT_REPO_PORT,
  JOURNAL_ENTRY_REPO_PORT,
  ACCOUNTING_PERIOD_REPO_PORT,
} from "./application/ports/accounting-repository.port";
import { ACCOUNTING_REPORT_QUERY_PORT } from "./application/ports/accounting-report-query.port";

// Use Cases
import { SetupAccountingUseCase } from "./application/use-cases/setup-accounting.usecase";
import { GetSetupStatusUseCase } from "./application/use-cases/get-setup-status.usecase";
import { CreateLedgerAccountUseCase } from "./application/use-cases/create-ledger-account.usecase";
import { UpdateLedgerAccountUseCase } from "./application/use-cases/update-ledger-account.usecase";
import { ListLedgerAccountsUseCase } from "./application/use-cases/list-ledger-accounts.usecase";
import { CreateJournalEntryUseCase } from "./application/use-cases/create-journal-entry.usecase";
import { UpdateJournalEntryUseCase } from "./application/use-cases/update-journal-entry.usecase";
import { PostJournalEntryUseCase } from "./application/use-cases/post-journal-entry.usecase";
import { ReverseJournalEntryUseCase } from "./application/use-cases/reverse-journal-entry.usecase";
import { ListJournalEntriesUseCase } from "./application/use-cases/list-journal-entries.usecase";
import { ClosePeriodUseCase } from "./application/use-cases/close-period.usecase";
import { ReopenPeriodUseCase } from "./application/use-cases/reopen-period.usecase";
import { UpdateAccountingSettingsUseCase } from "./application/use-cases/update-accounting-settings.usecase";
import { GetTrialBalanceUseCase } from "./application/use-cases/get-trial-balance.usecase";
import { GetGeneralLedgerUseCase } from "./application/use-cases/get-general-ledger.usecase";
import { GetProfitLossUseCase } from "./application/use-cases/get-profit-loss.usecase";
import { GetBalanceSheetUseCase } from "./application/use-cases/get-balance-sheet.usecase";

// Application Service
import { AccountingApplication } from "./application/accounting.application";
import { CogsPostingService } from "./application/services/cogs-posting.service";

// Controllers
import { AccountingController } from "./adapters/http/accounting.controller";

import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";

@Module({
  imports: [DataModule, KernelModule],
  controllers: [AccountingController],
  providers: [
    // Infrastructure - Logging
    NestLoggerAdapter,
    { provide: "LoggerPort", useExisting: NestLoggerAdapter },

    // Infrastructure - Repositories
    PrismaAccountingSettingsRepository,
    PrismaLedgerAccountRepository,
    PrismaJournalEntryRepository,
    PrismaAccountingPeriodRepository,
    PrismaAccountingReportQueryAdapter,

    // Ports
    { provide: ACCOUNTING_SETTINGS_REPO_PORT, useExisting: PrismaAccountingSettingsRepository },
    { provide: LEDGER_ACCOUNT_REPO_PORT, useExisting: PrismaLedgerAccountRepository },
    { provide: JOURNAL_ENTRY_REPO_PORT, useExisting: PrismaJournalEntryRepository },
    { provide: ACCOUNTING_PERIOD_REPO_PORT, useExisting: PrismaAccountingPeriodRepository },
    { provide: ACCOUNTING_REPORT_QUERY_PORT, useExisting: PrismaAccountingReportQueryAdapter },

    // Use Cases - Setup
    {
      provide: GetSetupStatusUseCase,
      useFactory: (logger, settingsRepo) =>
        new GetSetupStatusUseCase({
          logger,
          settingsRepo,
          accountRepo: null as any,
          entryRepo: null as any,
          periodRepo: null as any,
          idGenerator: null as any,
          clock: null as any,
        }),
      inject: [NestLoggerAdapter, ACCOUNTING_SETTINGS_REPO_PORT],
    },
    {
      provide: SetupAccountingUseCase,
      useFactory: (logger, settingsRepo, accountRepo, periodRepo, idGenerator, clock) =>
        new SetupAccountingUseCase({
          logger,
          settingsRepo,
          accountRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },

    // Use Cases - Accounts
    {
      provide: CreateLedgerAccountUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new CreateLedgerAccountUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateLedgerAccountUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new UpdateLedgerAccountUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ListLedgerAccountsUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new ListLedgerAccountsUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },

    // Use Cases - Journal Entries
    {
      provide: CreateJournalEntryUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new CreateJournalEntryUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateJournalEntryUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new UpdateJournalEntryUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: PostJournalEntryUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new PostJournalEntryUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ReverseJournalEntryUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new ReverseJournalEntryUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ListJournalEntriesUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new ListJournalEntriesUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },

    // Use Cases - Reports
    {
      provide: GetTrialBalanceUseCase,
      useFactory: (logger, settingsRepo, accountRepo, reportQuery) =>
        new GetTrialBalanceUseCase({
          logger,
          settingsRepo,
          accountRepo,
          reportQuery,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        ACCOUNTING_REPORT_QUERY_PORT,
      ],
    },
    {
      provide: GetGeneralLedgerUseCase,
      useFactory: (logger, settingsRepo, accountRepo, reportQuery) =>
        new GetGeneralLedgerUseCase({
          logger,
          settingsRepo,
          accountRepo,
          reportQuery,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        ACCOUNTING_REPORT_QUERY_PORT,
      ],
    },
    {
      provide: GetProfitLossUseCase,
      useFactory: (logger, settingsRepo, accountRepo, reportQuery) =>
        new GetProfitLossUseCase({
          logger,
          settingsRepo,
          accountRepo,
          reportQuery,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        ACCOUNTING_REPORT_QUERY_PORT,
      ],
    },
    {
      provide: GetBalanceSheetUseCase,
      useFactory: (logger, settingsRepo, accountRepo, reportQuery) =>
        new GetBalanceSheetUseCase({
          logger,
          settingsRepo,
          accountRepo,
          reportQuery,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        ACCOUNTING_REPORT_QUERY_PORT,
      ],
    },

    // Use Cases - Periods & Settings
    {
      provide: ClosePeriodUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new ClosePeriodUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ReopenPeriodUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new ReopenPeriodUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdateAccountingSettingsUseCase,
      useFactory: (logger, settingsRepo, accountRepo, entryRepo, periodRepo, idGenerator, clock) =>
        new UpdateAccountingSettingsUseCase({
          logger,
          settingsRepo,
          accountRepo,
          entryRepo,
          periodRepo,
          idGenerator,
          clock,
        }),
      inject: [
        NestLoggerAdapter,
        ACCOUNTING_SETTINGS_REPO_PORT,
        LEDGER_ACCOUNT_REPO_PORT,
        JOURNAL_ENTRY_REPO_PORT,
        ACCOUNTING_PERIOD_REPO_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },

    // Application Service Facade
    {
      provide: AccountingApplication,
      useFactory: (
        getSetupStatus,
        setupAccounting,
        createAccount,
        updateAccount,
        listAccounts,
        createEntry,
        updateEntry,
        postEntry,
        reverseEntry,
        listEntries,
        getTrialBalance,
        getGeneralLedger,
        getProfitLoss,
        getBalanceSheet,
        closePeriod,
        reopenPeriod,
        updateSettings
      ) =>
        new AccountingApplication(
          getSetupStatus,
          setupAccounting,
          createAccount,
          updateAccount,
          listAccounts,
          createEntry,
          updateEntry,
          postEntry,
          reverseEntry,
          listEntries,
          getTrialBalance,
          getGeneralLedger,
          getProfitLoss,
          getBalanceSheet,
          closePeriod,
          reopenPeriod,
          updateSettings
        ),
      inject: [
        GetSetupStatusUseCase,
        SetupAccountingUseCase,
        CreateLedgerAccountUseCase,
        UpdateLedgerAccountUseCase,
        ListLedgerAccountsUseCase,
        CreateJournalEntryUseCase,
        UpdateJournalEntryUseCase,
        PostJournalEntryUseCase,
        ReverseJournalEntryUseCase,
        ListJournalEntriesUseCase,
        GetTrialBalanceUseCase,
        GetGeneralLedgerUseCase,
        GetProfitLossUseCase,
        GetBalanceSheetUseCase,
        ClosePeriodUseCase,
        ReopenPeriodUseCase,
        UpdateAccountingSettingsUseCase,
      ],
    },

    // COGS Posting Service
    CogsPostingService,
  ],
  exports: [AccountingApplication, CogsPostingService],
})
export class AccountingModule {}
