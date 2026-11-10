import { afterEach, describe, expect, it, vi } from "vitest";
import { focusedOutcome, focusedRequestEvent } from "@corely/contracts";
import { installFocusedObservationSink, observeFocused } from "./focused-observation";
import { SessionClient } from "./session-client";
const bootstrapData = {
  csrfToken: "a".repeat(43),
  expiresAt: "2099-01-01T00:00:00Z",
  appKey: "invoice",
  user: {
    userId: "example",
    name: "Example",
    email: "example@example.invalid",
    memberships: [{ tenantId: "private-tenant", tenantName: "Example", roleId: "member" }],
  },
};

const restorers: Array<() => void> = [];
afterEach(() => {
  restorers
    .splice(0)
    .reverse()
    .forEach((restore) => restore());
});
describe("bounded focused diagnostics", () => {
  it("rejects arbitrary metadata, secrets, identifiers and unknown cardinality", () => {
    const sink = vi.fn();
    restorers.push(installFocusedObservationSink(sink));
    const safe = { surface: "invoice", layer: "browser", event: "api", outcome: "denied" };
    for (const extra of [
      { url: "/invoices/private?code=secret" },
      { cookie: "secret" },
      { requestId: "a".repeat(43) },
      { surface: "customer-123" },
      { outcome: "raw-exception" },
    ]) {
      observeFocused({ ...safe, ...extra });
    }
    expect(sink).not.toHaveBeenCalled();
    observeFocused(safe);
    expect(sink).toHaveBeenCalledWith(safe);
  });
  it("treats telemetry failure as best effort", () => {
    restorers.push(
      installFocusedObservationSink(() => {
        throw new Error("collector offline");
      })
    );
    expect(() =>
      observeFocused({ surface: "hr", layer: "browser", event: "app-launch", outcome: "rejected" })
    ).not.toThrow();
  });
  it.each([401, 403, 503])(
    "correlates %s without reporting private URL, body or headers",
    async (status) => {
      const sink = vi.fn();
      restorers.push(installFocusedObservationSink(sink));
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(Response.json(bootstrapData))
        .mockResolvedValueOnce(Response.json({ privateReason: "secret" }, { status }));
      const client = new SessionClient(
        { appKey: "invoice", tenantId: "private-tenant", workspaceId: "private-workspace" },
        fetcher
      );
      await client.bootstrap();
      sink.mockClear();
      await expect(
        client.request("/invoices/private-id?code=private-code", {
          method: "POST",
          body: "private-body",
          correlationId: "legacy-correlation",
        })
      ).rejects.toMatchObject({ status });
      expect(sink).toHaveBeenCalledTimes(1);
      const headers = new Headers(fetcher.mock.calls[1]?.[1]?.headers);
      expect(headers.get("x-correlation-id")).toBe("legacy-correlation");
      expect(sink).toHaveBeenCalledWith({
        surface: "invoice",
        layer: "browser",
        event: "api",
        outcome: focusedOutcome(status),
        requestId: headers.get("x-request-id"),
      });
      expect(JSON.stringify(sink.mock.calls)).not.toMatch(/private|csrf|legacy-correlation/);
      client.dispose();
    }
  );
  it("records prevented authentication return cycles without following or retaining them", async () => {
    const sink = vi.fn();
    restorers.push(installFocusedObservationSink(sink));
    const fetcher = vi.fn<typeof fetch>();
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    await expect(client.startLogin("/sso/authorize?request=private-proof")).rejects.toThrow(
      "Invalid return path"
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(sink).toHaveBeenCalledWith({
      surface: "invoice",
      layer: "browser",
      event: "redirect-loop",
      outcome: "rejected",
    });
  });
  it("classifies callback query values without retaining them", () => {
    expect(focusedRequestEvent("/auth/callback?code=secret&state=private")).toBe("callback");
    expect(focusedRequestEvent("/AUTH/CALLBACK/?code=secret")).toBe("callback");
    expect(focusedRequestEvent("/api/bff/people/private-personnel")).toBe("api");
  });
});
