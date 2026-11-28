import { describe, expect, it, vi } from "vitest";
import { parseLocalDate } from "@corely/kernel";
import { QuoteAggregate } from "@corely/sales/quote";
import { quoteSendRejection } from "@corely/sales/extensions";

describe("self-hosted quote rules", () => {
  it("scopes the quote validity rule and preserves existing totals and Party references", () => {
    const quote = QuoteAggregate.createDraft({
      id: "quote",
      tenantId: "acme",
      customerPartyId: "party",
      currency: "EUR",
      lineItems: [
        {
          id: "line",
          description: "Delivery",
          quantity: 2,
          unitPriceCents: 250,
          discountCents: 100,
        },
      ],
      now: new Date("2026-11-21T09:00:00Z"),
    });
    const check = vi.fn(({ validUntilDate }: { validUntilDate: string | null }) =>
      validUntilDate ? undefined : "Add a validity date."
    );
    const policies = [{ tenantId: "acme", check }];
    expect(
      quoteSendRejection(policies, quote.tenantId, { validUntilDate: quote.validUntilDate })
    ).toBe("Add a validity date.");
    expect(quoteSendRejection(policies, "other", { validUntilDate: null })).toBeUndefined();
    quote.updateHeader({ validUntilDate: parseLocalDate("2026-12-01") }, quote.createdAt);
    expect(
      quoteSendRejection(policies, quote.tenantId, { validUntilDate: quote.validUntilDate })
    ).toBeUndefined();
    quote.send("Q-001", quote.createdAt, quote.createdAt);
    expect(quote.status).toBe("SENT");
    expect(quote.totals.totalCents).toBe(400);
    expect(quote.customerPartyId).toBe("party");
    expect(check).toHaveBeenCalledTimes(2);
  });
});
