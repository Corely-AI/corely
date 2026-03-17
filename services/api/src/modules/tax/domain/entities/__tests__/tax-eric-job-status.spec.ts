import { describe, expect, it } from "vitest";
import {
  isFailedTaxEricJobStatus,
  isTerminalTaxEricJobStatus,
  mapGatewayOutcomeToTaxEricJobStatus,
} from "../tax-eric-job-status";

describe("tax-eric-job-status", () => {
  it("maps success with warnings to the warning terminal state", () => {
    expect(
      mapGatewayOutcomeToTaxEricJobStatus({
        outcome: "success",
        hasWarnings: true,
      })
    ).toBe("succeeded_with_warnings");
  });

  it("maps validation failure to validation_failed", () => {
    expect(
      mapGatewayOutcomeToTaxEricJobStatus({
        outcome: "validation_failed",
        hasWarnings: false,
      })
    ).toBe("validation_failed");
  });

  it("marks only completed states as terminal", () => {
    expect(isTerminalTaxEricJobStatus("queued")).toBe(false);
    expect(isTerminalTaxEricJobStatus("running")).toBe(false);
    expect(isTerminalTaxEricJobStatus("succeeded")).toBe(true);
  });

  it("treats only failure states as failed", () => {
    expect(isFailedTaxEricJobStatus("technical_failed")).toBe(true);
    expect(isFailedTaxEricJobStatus("succeeded_with_warnings")).toBe(false);
  });
});
