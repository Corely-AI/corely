import { NotFoundError, ValidationError } from "@corely/kernel";
import { type TaxReportRepoPort } from "../../domain/ports";
import { type TaxReportEntity } from "../../domain/entities";

const buildIncomeTaxPeriod = (year: number) => {
  const periodStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
  const dueDate = new Date(Date.UTC(year + 1, 6, 31, 23, 59, 59, 999));
  return {
    periodStart,
    periodEnd,
    dueDate,
  };
};

export const ensureIncomeTaxDraftReport = async (params: {
  reportRepo: TaxReportRepoPort;
  workspaceId: string;
  year: number;
}): Promise<TaxReportEntity> => {
  const period = buildIncomeTaxPeriod(params.year);

  return params.reportRepo.upsertByPeriod({
    tenantId: params.workspaceId,
    type: "INCOME_TAX",
    group: "ANNUAL_REPORT",
    periodLabel: String(params.year),
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    dueDate: period.dueDate,
    status: "OPEN",
    amountFinalCents: null,
  });
};

export const getIncomeTaxDraftReportById = async (params: {
  reportRepo: TaxReportRepoPort;
  workspaceId: string;
  draftId: string;
}): Promise<TaxReportEntity> => {
  const report = await params.reportRepo.findById(params.workspaceId, params.draftId);
  if (!report) {
    throw new NotFoundError("Income tax draft not found", { draftId: params.draftId });
  }

  if (report.type !== "INCOME_TAX") {
    throw new ValidationError(
      "The provided draft id is not an income-tax draft.",
      undefined,
      "Tax:DraftTypeMismatch"
    );
  }

  return report;
};
