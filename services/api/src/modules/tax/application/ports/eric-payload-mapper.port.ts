import type { AnnualIncomeSectionPayload } from "@corely/contracts";

export const ERIC_PAYLOAD_MAPPER_PORT = Symbol("ERIC_PAYLOAD_MAPPER_PORT");

export type TaxEricReportSnapshot = {
  filingId: string;
  reportId: string;
  reportType: "annual_income_report";
  taxYear: number;
  annualIncome: AnnualIncomeSectionPayload;
};

export type TaxEricRequest = {
  gateway: "elster-gateway";
  version: string;
  reportType: "annual_income_report";
  payload: Record<string, unknown>;
  notes: string;
};

export abstract class EricPayloadMapperPort {
  abstract mapReportToEricPayload(snapshot: TaxEricReportSnapshot): TaxEricRequest;
}
