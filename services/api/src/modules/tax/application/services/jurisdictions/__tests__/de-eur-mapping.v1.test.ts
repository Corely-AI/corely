import { describe, expect, it } from "vitest";
import { buildDeEurStatement } from "../de-eur-mapping.v1";

describe("buildDeEurStatement", () => {
  it("maps DE category totals into ordered lines and totals", () => {
    const statement = buildDeEurStatement({
      year: 2025,
      currency: "EUR",
      basis: "cash",
      incomeByCategory: {
        "income.sales": 1_200_000,
        "income.other": 50_000,
      },
      expenseByCategory: {
        "expense.rent": 200_000,
        "expense.software": 30_000,
        "expense.custom_stationery": 10_000,
      },
      generatedAt: new Date("2026-03-04T10:00:00.000Z"),
    });

    expect(statement.year).toBe(2025);
    expect(statement.jurisdiction).toBe("DE");
    expect(statement.basis).toBe("cash");
    expect(statement.totals.incomeCents).toBe(1_250_000);
    expect(statement.totals.expenseCents).toBe(240_000);
    expect(statement.totals.profitCents).toBe(1_010_000);

    expect(statement.lines.find((line) => line.id === "income.sales")?.amountCents).toBe(1_200_000);
    expect(statement.lines.find((line) => line.id === "income.other")?.amountCents).toBe(50_000);
    expect(statement.lines.find((line) => line.id === "expense.rent")?.amountCents).toBe(200_000);
    expect(statement.lines.find((line) => line.id === "expense.software")?.amountCents).toBe(
      30_000
    );
    expect(
      statement.lines.find((line) => line.id === "expense.custom_stationery")?.amountCents
    ).toBe(10_000);
  });
});
