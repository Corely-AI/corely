import type { TaxEricJobStatus, TaxElsterGatewayOutcome } from "@corely/contracts";

export const isTerminalTaxEricJobStatus = (status: TaxEricJobStatus): boolean =>
  status !== "queued" && status !== "running";

export const isFailedTaxEricJobStatus = (status: TaxEricJobStatus): boolean =>
  status === "validation_failed" || status === "submission_failed" || status === "technical_failed";

export const mapGatewayOutcomeToTaxEricJobStatus = (params: {
  outcome: TaxElsterGatewayOutcome;
  hasWarnings: boolean;
}): TaxEricJobStatus => {
  switch (params.outcome) {
    case "success_with_warnings":
      return "succeeded_with_warnings";
    case "validation_failed":
      return "validation_failed";
    case "submission_failed":
      return "submission_failed";
    case "technical_failed":
      return "technical_failed";
    case "success":
    default:
      return params.hasWarnings ? "succeeded_with_warnings" : "succeeded";
  }
};
