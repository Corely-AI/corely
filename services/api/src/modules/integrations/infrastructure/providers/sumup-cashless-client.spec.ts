import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SumUpCashlessClient } from "@corely/integrations-sumup";
import type { CashlessAttemptStatus } from "@corely/contracts";

describe("SumUpCashlessClient", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.fetch = originalFetch;
  });

  it.each([
    { providerStatus: "PENDING", normalized: "pending" },
    { providerStatus: "AUTHORISED", normalized: "authorized" },
    { providerStatus: "SUCCESSFUL", normalized: "paid" },
    { providerStatus: "DECLINED", normalized: "failed" },
    { providerStatus: "CANCELLED", normalized: "cancelled" },
    { providerStatus: "EXPIRED", normalized: "expired" },
    { providerStatus: "UNRECOGNIZED", normalized: "pending" },
  ] as const)("maps $providerStatus to $normalized", async ({ providerStatus, normalized }) => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "sumup-checkout-1",
          status: providerStatus,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const client = new SumUpCashlessClient({
      apiKey: "sumup-test-key",
      baseUrl: "https://sumup.local.test",
    });

    const session = await client.getStatus("sumup-checkout-1");
    expect(session.status).toBe(normalized satisfies CashlessAttemptStatus);
  });

  it("returns redirect action when checkout_url is available", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: "sumup-checkout-2",
          status: "PENDING",
          checkout_url: "https://checkout.sumup.test/session",
          qr_code: "qr-ignored-when-redirect-exists",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const client = new SumUpCashlessClient({
      apiKey: "sumup-test-key",
      baseUrl: "https://sumup.local.test",
    });

    const session = await client.getStatus("sumup-checkout-2");
    expect(session.action).toEqual({
      type: "redirect_url",
      url: "https://checkout.sumup.test/session",
    });
  });
});
