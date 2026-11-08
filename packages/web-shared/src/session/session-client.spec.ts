import { z } from "zod";
import { describe, expect, it, vi } from "vitest";
import { SessionClient } from "./session-client";
export const bootstrapData = {
  csrfToken: "a".repeat(43),
  expiresAt: "2099-01-01T00:00:00.000Z",
  appKey: "invoice",
  user: {
    userId: "colleague-1",
    name: "Synthetic colleague",
    email: "colleague@example.invalid",
    memberships: [{ tenantId: "team-1", tenantName: "Synthetic team", roleId: "member" }],
  },
};
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
describe("opt-in session transport", () => {
  it.each(["app-center", "invoice", "hr"] as const)(
    "reuses the same client with %s configuration and no token storage",
    async (appKey) => {
      const read = vi.spyOn(Storage.prototype, "getItem");
      const write = vi.spyOn(Storage.prototype, "setItem");
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json({ ...bootstrapData, appKey }))
        .mockResolvedValueOnce(json({ ok: true }));
      const client = new SessionClient(
        { appKey, tenantId: "team-1", workspaceId: "workspace-1" },
        fetcher
      );
      await Promise.all([client.bootstrap(), client.bootstrap()]);
      const result = await client.request("/invoices", {
        method: "POST",
        body: "{}",
        idempotencyKey: "once",
        correlationId: "trace",
      });
      await result.json();
      expect(fetcher).toHaveBeenCalledTimes(2);
      const [url, options] = fetcher.mock.calls[1];
      expect(url).toBe("/api/bff/invoices");
      expect(options).toMatchObject({
        credentials: "same-origin",
        mode: "same-origin",
        redirect: "error",
      });
      const headers = new Headers(options?.headers);
      expect(headers.get("x-csrf-token")).toBe(bootstrapData.csrfToken);
      expect(headers.get("x-idempotency-key")).toBe("once");
      expect(headers.get("x-correlation-id")).toBe("trace");
      expect(headers.get("x-tenant-id")).toBe("team-1");
      expect(headers.get("x-workspace-id")).toBe("workspace-1");
      expect(headers.has("authorization")).toBe(false);
      expect(read).not.toHaveBeenCalled();
      expect(write).not.toHaveBeenCalled();
      vi.restoreAllMocks();
      client.dispose();
    }
  );
  it.each([
    [401, "unauthenticated"],
    [403, "forbidden"],
    [503, "unavailable"],
  ] as const)("classifies %s and never retries a mutation", async (status, kind) => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(bootstrapData))
      .mockResolvedValueOnce(json({}, status));
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    const failure = vi.fn();
    client.onFailure(failure);
    await client.bootstrap();
    await expect(
      client.request("/invoices", { method: "POST", body: "{}", idempotencyKey: "once" })
    ).rejects.toMatchObject({ status, kind });
    expect(failure).toHaveBeenCalledWith(kind);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("treats network failure as unavailable without refresh/replay", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("offline"));
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    await expect(client.bootstrap()).rejects.toMatchObject({ kind: "unavailable" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects wrong app bindings and expired bootstrap data", async () => {
    for (const data of [
      { ...bootstrapData, appKey: "hr" },
      { ...bootstrapData, expiresAt: "2000-01-01T00:00:00.000Z" },
    ]) {
      const client = new SessionClient(
        { appKey: "invoice" },
        vi.fn<typeof fetch>().mockResolvedValue(json(data))
      );
      await expect(client.bootstrap()).rejects.toMatchObject({ kind: "unavailable" });
    }
  });
  it("keeps identity assertions and arbitrary URL destinations outside the transport", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(json(bootstrapData));
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    await client.bootstrap();
    for (const path of [
      "https://evil.test",
      "//evil.test",
      "/invoices/../auth",
      "/invoices%2fauth",
    ]) {
      await expect(client.request(path)).rejects.toThrow("Invalid API path");
    }
    await expect(
      client.request("/invoices", { headers: { Authorization: "forged" } })
    ).rejects.toThrow("Identity headers");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rotates once and applies the new proof to subsequent PDF reads", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(bootstrapData))
      .mockResolvedValueOnce(
        json({ csrfToken: "b".repeat(43), expiresAt: bootstrapData.expiresAt })
      )
      .mockResolvedValueOnce(json({}));
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    await client.bootstrap();
    await Promise.all([client.rotate(), client.rotate()]);
    await (await client.request("/invoices/id/pdf")).json();
    expect(new Headers(fetcher.mock.calls[2][1]?.headers).get("x-csrf-token")).toBe("b".repeat(43));
    expect(fetcher.mock.calls[1][0]).toBe("/api/session/rotate");
  });
  it("cancels streams after headers and prevents responses from a disposed scope", async () => {
    let requestSignal: AbortSignal | null | undefined;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(bootstrapData))
      .mockImplementationOnce(async (_url, init) => {
        requestSignal = init?.signal;
        return new Response(
          new ReadableStream({
            start(sink) {
              sink.enqueue(new TextEncoder().encode("first"));
            },
          })
        );
      });
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    await client.bootstrap();
    const abort = new AbortController();
    const response = await client.request("/copilot/chat", { signal: abort.signal });
    const reader = response.body!.getReader();
    expect((await reader.read()).done).toBe(false);
    abort.abort();
    expect(requestSignal?.aborted).toBe(true);
    await reader.cancel();
    client.dispose();
  });
  it("rejects an old account's in-flight JSON after bootstrap verifies another account", async () => {
    let finish!: (response: Response) => void;
    let oldSignal: AbortSignal | null | undefined;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(bootstrapData))
      .mockImplementationOnce((_input, init) => {
        oldSignal = init?.signal;
        return new Promise((resolve) => {
          finish = resolve;
        });
      })
      .mockResolvedValueOnce(
        json({
          ...bootstrapData,
          csrfToken: "b".repeat(43),
          user: { ...bootstrapData.user, userId: "colleague-2" },
        })
      );
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    await client.bootstrap();
    const oldRequest = client.json("/invoices", z.object({ privateOwner: z.string() }));
    const current = await client.bootstrap();
    expect(current.user.userId).toBe("colleague-2");
    // This fake transport deliberately resolves despite cancellation to check the epoch guard too.
    finish(json({ privateOwner: "colleague-1" }));
    await expect(oldRequest).rejects.toMatchObject({ name: "AbortError" });
    expect(oldSignal?.aborted).toBe(true);
    client.dispose();
  });
  it("can rotate after an unauthenticated refresh failure followed by successful bootstrap", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(bootstrapData))
      .mockResolvedValueOnce(
        json({ csrfToken: "b".repeat(43), expiresAt: bootstrapData.expiresAt })
      );
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    await expect(client.rotate()).rejects.toMatchObject({ kind: "unauthenticated" });
    await client.bootstrap();
    await expect(client.rotate()).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0]).toBe("/api/session/rotate");
    client.dispose();
  });
  it("classifies an interrupted response body as unavailable and notifies the provider once", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(bootstrapData))
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            start(sink) {
              sink.error(new TypeError("network interrupted after headers"));
            },
          })
        )
      );
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    const failed = vi.fn();
    client.onFailure(failed);
    await client.bootstrap();
    await expect(client.json("/invoices", z.unknown())).rejects.toMatchObject({
      status: 503,
      kind: "unavailable",
    });
    expect(failed).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledWith("unavailable");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("preserves caller cancellation after headers without publishing an outage", async () => {
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(bootstrapData))
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream<Uint8Array>({
            start(sink) {
              source = sink;
            },
          })
        )
      );
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    const failure = vi.fn();
    client.onFailure(failure);
    await client.bootstrap();
    const controller = new AbortController();
    const response = await client.request("/documents/id/download", { signal: controller.signal });
    const read = response.arrayBuffer();
    controller.abort();
    source.error(new DOMException("Caller cancelled", "AbortError"));
    await expect(read).rejects.toMatchObject({ name: "AbortError" });
    expect(failure).not.toHaveBeenCalled();
    client.dispose();
  });
  it("keeps ordinary domain errors separate from session failures", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(bootstrapData))
      .mockResolvedValueOnce(json({}, 400))
      .mockResolvedValueOnce(json({ ok: true }));
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    const failure = vi.fn();
    client.onFailure(failure);
    await client.bootstrap();
    await expect(client.request("/invoices", { method: "POST" })).rejects.toMatchObject({
      status: 400,
      kind: "request",
    });
    expect(failure).not.toHaveBeenCalled();
    await expect(client.json("/invoices", z.object({ ok: z.boolean() }))).resolves.toEqual({
      ok: true,
    });
    client.dispose();
  });
  it("starts central login with a validated relative destination and no bearer response", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json({ csrfToken: "a".repeat(43) }))
      .mockResolvedValueOnce(
        json({ redirectTo: "https://login.corely.test/sso/authorize?request=synthetic" })
      );
    const client = new SessionClient({ appKey: "invoice" }, fetcher);
    await expect(client.startLogin("//evil.test")).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
    expect(await client.startLogin("/invoices?tab=open")).toContain(
      "https://login.corely.test/sso/authorize"
    );
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({
      returnPath: "/invoices?tab=open",
      csrfToken: "a".repeat(43),
    });
  });
});
