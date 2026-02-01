import { BaseUseCase, type LoggerPort, NotFoundError, RequireTenant } from "@corely/kernel";
import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import { ok, err } from "@corely/kernel";
import type { GetGeneralLedgerInput, GetGeneralLedgerOutput } from "@corely/contracts";
import type {
  AccountingSettingsRepoPort,
  LedgerAccountRepoPort,
} from "../ports/accounting-repository.port";
import type { AccountingReportQueryPort } from "../ports/accounting-report-query.port";

type Deps = {
  logger: LoggerPort;
  settingsRepo: AccountingSettingsRepoPort;
  accountRepo: LedgerAccountRepoPort;
  reportQuery: AccountingReportQueryPort;
};

@RequireTenant()
export class GetGeneralLedgerUseCase extends BaseUseCase<
  GetGeneralLedgerInput,
  GetGeneralLedgerOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetGeneralLedgerInput,
    ctx: UseCaseContext
  ): Promise<Result<GetGeneralLedgerOutput, UseCaseError>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tenantId = ctx.tenantId!;

    const settings = await this.deps.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting not set up"));
    }

    const account = await this.deps.accountRepo.findById(tenantId, input.accountId);
    if (!account) {
      return err(new NotFoundError("Account not found"));
    }

    // Get lines for this account in date range
    const lines = await this.deps.reportQuery.listLedgerLines({
      tenantId,
      accountId: input.accountId,
      fromDate: input.fromDate,
      toDate: input.toDate,
    });

    // Calculate opening balance (before fromDate)
    const openingTotals = await this.deps.reportQuery.getAccountActivityTotals({
      tenantId,
      accountId: input.accountId,
      toDateExclusive: input.fromDate,
    });

    const openingBalanceCents = openingTotals.debitsCents - openingTotals.creditsCents;

    // Build ledger entries with running balance
    let runningBalance = openingBalanceCents;
    const entries = lines.map((line) => {
      const debitCents = line.direction === "Debit" ? line.amountCents : 0;
      const creditCents = line.direction === "Credit" ? line.amountCents : 0;

      runningBalance += debitCents - creditCents;

      return {
        id: line.id,
        journalEntryId: line.journalEntryId,
        journalEntryNumber: line.journalEntry.entryNumber || null,
        postingDate: line.journalEntry.postingDate.toISOString().split("T")[0],
        memo: line.journalEntry.memo,
        lineMemo: line.lineMemo || null,
        debitCents,
        creditCents,
        balanceCents: runningBalance,
      };
    });

    const totalDebits = lines
      .filter((l) => l.direction === "Debit")
      .reduce((sum, l) => sum + l.amountCents, 0);
    const totalCredits = lines
      .filter((l) => l.direction === "Credit")
      .reduce((sum, l) => sum + l.amountCents, 0);

    return ok({
      generalLedger: {
        ledgerAccountId: account.id,
        ledgerAccountCode: account.code,
        ledgerAccountName: account.name,
        ledgerAccountType: account.type,
        fromDate: input.fromDate,
        toDate: input.toDate,
        currency: settings.baseCurrency,
        openingBalanceCents,
        entries,
        closingBalanceCents: runningBalance,
        totalDebitsCents: totalDebits,
        totalCreditsCents: totalCredits,
      },
    });
  }
}
