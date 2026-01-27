import { BaseUseCase, type LoggerPort, NotFoundError, RequireTenant } from "@corely/kernel";
import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import { ok, err } from "@corely/kernel";
import type { GetProfitLossInput, GetProfitLossOutput, AccountType } from "@corely/contracts";
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
export class GetProfitLossUseCase extends BaseUseCase<GetProfitLossInput, GetProfitLossOutput> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetProfitLossInput,
    ctx: UseCaseContext
  ): Promise<Result<GetProfitLossOutput, UseCaseError>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tenantId = ctx.tenantId!;

    const settings = await this.deps.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting not set up"));
    }

    const { accounts } = await this.deps.accountRepo.list(tenantId, { limit: 1000 });

    const incomeAccounts = accounts.filter((a) => a.type === "Income");
    const expenseAccounts = accounts.filter((a) => a.type === "Expense");

    const incomeLines = await Promise.all(
      incomeAccounts.map(async (account) => {
        const amount = await this.calculateAccountBalance(
          tenantId,
          account.id,
          account.type,
          input.fromDate,
          input.toDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          amountCents: amount,
        };
      })
    );

    const expenseLines = await Promise.all(
      expenseAccounts.map(async (account) => {
        const amount = await this.calculateAccountBalance(
          tenantId,
          account.id,
          account.type,
          input.fromDate,
          input.toDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          amountCents: amount,
        };
      })
    );

    const totalIncome = incomeLines.reduce((sum, l) => sum + l.amountCents, 0);
    const totalExpenses = expenseLines.reduce((sum, l) => sum + l.amountCents, 0);
    const netProfit = totalIncome - totalExpenses;

    return ok({
      profitLoss: {
        fromDate: input.fromDate,
        toDate: input.toDate,
        currency: settings.baseCurrency,
        incomeAccounts: incomeLines.filter((l) => l.amountCents !== 0),
        expenseAccounts: expenseLines.filter((l) => l.amountCents !== 0),
        totalIncomeCents: totalIncome,
        totalExpensesCents: totalExpenses,
        netProfitCents: netProfit,
      },
    });
  }

  private async calculateAccountBalance(
    tenantId: string,
    accountId: string,
    accountType: AccountType,
    fromDate: string,
    toDate: string
  ): Promise<number> {
    const totals = await this.deps.reportQuery.getAccountActivityTotals({
      tenantId,
      accountId,
      fromDate,
      toDate,
    });

    const debitSum = totals.debitsCents;
    const creditSum = totals.creditsCents;

    // For Income accounts, credits increase balance (normal credit balance)
    // For Expense accounts, debits increase balance (normal debit balance)
    if (accountType === "Income") {
      return creditSum - debitSum;
    } else {
      return debitSum - creditSum;
    }
  }
}
