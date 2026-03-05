import { describe, expect, it } from "vitest";
import {
  calculateAnnualIncomeTotals,
  evaluateAnnualIncomeSectionCompletion,
  validateAnnualIncomeSectionPayload,
} from "../annual-income-report.service";

describe("annual-income-report.service", () => {
  it("calculates annual income totals", () => {
    const totals = calculateAnnualIncomeTotals({
      noIncomeFlag: false,
      incomeSources: [
        {
          type: "employment",
          label: "Main employer",
          country: "DE",
          amounts: {
            grossIncome: 100_000,
            taxesWithheld: 20_000,
            socialContributions: 10_000,
            expensesRelated: 5_000,
          },
        },
      ],
    });

    expect(totals.grossIncome).toBe(100_000);
    expect(totals.taxesWithheld).toBe(20_000);
    expect(totals.socialContributions).toBe(10_000);
    expect(totals.expensesRelated).toBe(5_000);
    expect(totals.taxableIncome).toBe(85_000);
  });

  it("returns validation errors for inconsistent noIncomeFlag payload", () => {
    const validated = validateAnnualIncomeSectionPayload({
      noIncomeFlag: true,
      incomeSources: [
        {
          type: "employment",
          label: "Salary",
          country: "DE",
          amounts: {
            grossIncome: 1000,
          },
        },
      ],
    });

    expect(validated.validationErrors.length).toBeGreaterThan(0);
    expect(validated.validationErrors.some((error) => error.path === "incomeSources")).toBe(true);
  });

  it("marks section complete when at least one valid source exists without errors", () => {
    const payload = {
      noIncomeFlag: false,
      incomeSources: [
        {
          type: "freelance" as const,
          label: "Client X",
          country: "DE",
          amounts: {
            grossIncome: 5_000,
          },
        },
      ],
    };

    const completion = evaluateAnnualIncomeSectionCompletion({
      payload,
      validationErrors: [],
    });

    expect(completion.completion).toBe(1);
    expect(completion.isComplete).toBe(true);
  });
});
