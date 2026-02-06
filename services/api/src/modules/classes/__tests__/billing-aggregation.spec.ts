import { describe, expect, it } from "vitest";
import { aggregateBillingPreview } from "../domain/rules/billing.rules";
import { resolveBillableForStatus } from "../domain/rules/attendance.rules";

describe("classes billing aggregation", () => {
  it("applies default billable rules", () => {
    expect(resolveBillableForStatus("PRESENT")).toBe(true);
    expect(resolveBillableForStatus("MAKEUP")).toBe(true);
    expect(resolveBillableForStatus("ABSENT")).toBe(false);
    expect(resolveBillableForStatus("EXCUSED")).toBe(false);
  });

  it("aggregates per payer and class group with price overrides", () => {
    const rows = [
      {
        payerClientId: "client-a",
        classGroupId: "group-1",
        classGroupName: "Math A",
        priceCents: 2000,
        currency: "EUR",
      },
      {
        payerClientId: "client-a",
        classGroupId: "group-1",
        classGroupName: "Math A",
        priceCents: 2000,
        currency: "EUR",
      },
      {
        payerClientId: "client-a",
        classGroupId: "group-2",
        classGroupName: "Physics",
        priceCents: 2500,
        currency: "EUR",
      },
      {
        payerClientId: "client-b",
        classGroupId: "group-1",
        classGroupName: "Math A",
        priceCents: 1500,
        currency: "EUR",
      },
    ];

    const result = aggregateBillingPreview(rows);
    const clientA = result.find((item) => item.payerClientId === "client-a");
    const clientB = result.find((item) => item.payerClientId === "client-b");

    expect(clientA?.totalSessions).toBe(3);
    expect(clientA?.totalAmountCents).toBe(2000 * 2 + 2500);
    expect(clientA?.lines).toHaveLength(2);

    expect(clientB?.totalSessions).toBe(1);
    expect(clientB?.totalAmountCents).toBe(1500);
    expect(clientB?.lines[0]?.priceCents).toBe(1500);
  });
});
