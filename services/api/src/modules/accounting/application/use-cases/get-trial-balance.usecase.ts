import { BaseUseCase, type LoggerPort, ValidationError, NotFoundError } from "@corely/kernel";
import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import { ok, err } from "@corely/kernel";
import type { GetTrialBalanceInput, GetTrialBalanceOutput } from "@corely/contracts";
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

export class GetTrialBalanceUseCase extends BaseUseCase<
  GetTrialBalanceInput,
  GetTrialBalanceOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetTrialBalanceInput,
    ctx: UseCaseContext
  ): Promise<Result<GetTrialBalanceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const settings = await this.deps.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting not set up"));
    }

    // Get all accounts
    const { accounts } = await this.deps.accountRepo.list(ctx.tenantId, { limit: 1000 });

    // Calculate balances for each account
    const lines = await Promise.all(
      accounts.map(async (account) => {
        const { debits, credits } = await this.calculateAccountActivity(
          ctx.tenantId,
          account.id,
          input.fromDate,
          input.toDate
        );

        const balance = debits - credits;

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          ledgerAccountType: account.type,
          debitsCents: debits,
          creditsCents: credits,
          balanceCents: balance,
        };
      })
    );

    // Filter out zero balances
    const nonZeroLines = lines.filter((l) => l.debitsCents !== 0 || l.creditsCents !== 0);

    const totalDebits = nonZeroLines.reduce((sum, l) => sum + l.debitsCents, 0);
    const totalCredits = nonZeroLines.reduce((sum, l) => sum + l.creditsCents, 0);

    return ok({
      trialBalance: {
        fromDate: input.fromDate,
        toDate: input.toDate,
        currency: settings.baseCurrency,
        lines: nonZeroLines,
        totalDebitsCents: totalDebits,
        totalCreditsCents: totalCredits,
      },
    });
  }

  private async calculateAccountActivity(
    tenantId: string,
    accountId: string,
    fromDate: string,
    toDate: string
  ): Promise<{ debits: number; credits: number }> {
    const totals = await this.deps.reportQuery.getAccountActivityTotals({
      tenantId,
      accountId,
      fromDate,
      toDate,
    });

    return {
      debits: totals.debitsCents,
      credits: totals.creditsCents,
    };
  }
}
