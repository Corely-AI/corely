import { BaseUseCase, type LoggerPort, NotFoundError, RequireTenant } from "@corely/kernel";
import type { Result, UseCaseContext, UseCaseError } from "@corely/kernel";
import { ok, err } from "@corely/kernel";
import type { GetBalanceSheetInput, GetBalanceSheetOutput, AccountType } from "@corely/contracts";
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
export class GetBalanceSheetUseCase extends BaseUseCase<
  GetBalanceSheetInput,
  GetBalanceSheetOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GetBalanceSheetInput,
    ctx: UseCaseContext
  ): Promise<Result<GetBalanceSheetOutput, UseCaseError>> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const tenantId = ctx.tenantId!;

    const settings = await this.deps.settingsRepo.findByTenant(tenantId);
    if (!settings) {
      return err(new NotFoundError("Accounting not set up"));
    }

    const { accounts } = await this.deps.accountRepo.list(tenantId, { limit: 1000 });

    const assetAccounts = accounts.filter((a) => a.type === "Asset");
    const liabilityAccounts = accounts.filter((a) => a.type === "Liability");
    const equityAccounts = accounts.filter((a) => a.type === "Equity");

    const assetLines = await Promise.all(
      assetAccounts.map(async (account) => {
        const balance = await this.calculateAccountBalanceAsOf(
          tenantId,
          account.id,
          account.type,
          input.asOfDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          balanceCents: balance,
        };
      })
    );

    const liabilityLines = await Promise.all(
      liabilityAccounts.map(async (account) => {
        const balance = await this.calculateAccountBalanceAsOf(
          tenantId,
          account.id,
          account.type,
          input.asOfDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          balanceCents: balance,
        };
      })
    );

    const equityLines = await Promise.all(
      equityAccounts.map(async (account) => {
        const balance = await this.calculateAccountBalanceAsOf(
          tenantId,
          account.id,
          account.type,
          input.asOfDate
        );

        return {
          ledgerAccountId: account.id,
          ledgerAccountCode: account.code,
          ledgerAccountName: account.name,
          balanceCents: balance,
        };
      })
    );

    const totalAssets = assetLines.reduce((sum, l) => sum + l.balanceCents, 0);
    const totalLiabilities = liabilityLines.reduce((sum, l) => sum + l.balanceCents, 0);
    const totalEquity = equityLines.reduce((sum, l) => sum + l.balanceCents, 0);

    return ok({
      balanceSheet: {
        asOfDate: input.asOfDate,
        currency: settings.baseCurrency,
        assetAccounts: assetLines.filter((l) => l.balanceCents !== 0),
        liabilityAccounts: liabilityLines.filter((l) => l.balanceCents !== 0),
        equityAccounts: equityLines.filter((l) => l.balanceCents !== 0),
        totalAssetsCents: totalAssets,
        totalLiabilitiesCents: totalLiabilities,
        totalEquityCents: totalEquity,
      },
    });
  }

  private async calculateAccountBalanceAsOf(
    tenantId: string,
    accountId: string,
    accountType: AccountType,
    asOfDate: string
  ): Promise<number> {
    const totals = await this.deps.reportQuery.getAccountActivityTotals({
      tenantId,
      accountId,
      toDate: asOfDate,
    });

    const debitSum = totals.debitsCents;
    const creditSum = totals.creditsCents;

    // Assets have normal debit balance
    // Liabilities and Equity have normal credit balance
    if (accountType === "Asset") {
      return debitSum - creditSum;
    } else {
      return creditSum - debitSum;
    }
  }
}
