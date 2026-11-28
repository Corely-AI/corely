import { describe, expect, it, vi } from "vitest";
import { SessionClient } from "./session-client";
import { SessionFeatureHttpClient } from "./feature-http-client";
const profile = {
  csrfToken: "a".repeat(43),
  expiresAt: "2099-01-01T00:00:00Z",
  appKey: "invoice",
  user: { userId: "user", email: "user@example.invalid", name: "Synthetic", memberships: [] },
};
async function fixture(workspace = "workspace-a") {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json(profile))
    .mockImplementation(async () => Response.json({ saved: true }));
  const client = new SessionClient(
    { appKey: "invoice", tenantId: "tenant-a", workspaceId: workspace },
    fetcher
  );
  await client.bootstrap();
  return { fetcher, client, http: new SessionFeatureHttpClient(client) };
}
describe("feature facade cookie-session adapter", () => {
  it("encodes existing DTOs and preserves scope, command identity and CSRF without bearer tokens", async () => {
    const { fetcher, http } = await fixture();
    expect(
      await http.post("/invoices", { currency: "EUR" }, { idempotencyKey: "stable-key" })
    ).toEqual({ saved: true });
    const [path, options] = fetcher.mock.calls[1];
    expect(path).toBe("/api/bff/invoices");
    expect(options?.body).toBe('{"currency":"EUR"}');
    const headers = new Headers(options?.headers);
    expect(headers.get("x-workspace-id")).toBe("workspace-a");
    expect(headers.get("x-tenant-id")).toBe("tenant-a");
    expect(headers.get("x-csrf-token")).toBe(profile.csrfToken);
    expect(headers.get("x-idempotency-key")).toBe("stable-key");
    expect(headers.has("authorization")).toBe(false);
  });
  it("keeps simultaneous adapters independent and assigns one command key per attempt", async () => {
    const a = await fixture();
    const b = await fixture("workspace-b");
    await Promise.all([a.http.patch("/invoices/a", {}), b.http.patch("/invoices/b", {})]);
    const ah = new Headers(a.fetcher.mock.calls[1][1]?.headers);
    const bh = new Headers(b.fetcher.mock.calls[1][1]?.headers);
    expect(ah.get("x-workspace-id")).toBe("workspace-a");
    expect(bh.get("x-workspace-id")).toBe("workspace-b");
    expect(ah.get("x-idempotency-key")).toBeTruthy();
    expect(bh.get("x-idempotency-key")).not.toBe(ah.get("x-idempotency-key"));
  });
  it("rejects unscoped or caller-overridden authority and does not retry failed writes", async () => {
    const { fetcher, http } = await fixture();
    await expect(http.get("/invoices", { workspaceScope: "none" })).rejects.toThrow(
      "require workspace scope"
    );
    await expect(
      http.post("/invoices", {}, { headers: { "x-tenant-id": "foreign" } })
    ).rejects.toThrow("Identity headers");
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockRejectedValueOnce(new TypeError("Synthetic offline connection"));
    await expect(http.post("/invoices", {})).rejects.toThrow("temporarily unavailable");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
