export const TAX_EUR_SOURCE_PORT = Symbol("TAX_EUR_SOURCE_PORT");

export type TaxEurSourceInput = {
  workspaceId: string;
  year: number;
  basis: "cash";
};

export type TaxEurSourceTotals = {
  currency: string;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
};

export abstract class TaxEurSourcePort {
  abstract getEurTotals(input: TaxEurSourceInput): Promise<TaxEurSourceTotals>;
}
