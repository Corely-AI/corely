// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import middleware from "../../../middleware";

const publicOrigin = "https://app.corely.one";
const apiBaseUrl = "https://api.corely.one";
const signerSession = "s".repeat(43);
const setSignerCookie = `corely_sign_session=${signerSession}; Path=/api/signing; HttpOnly; Secure; SameSite=Strict`;

function configureProxy() {
  const upstream = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", upstream);
  return upstream;
}

function signingRequest(action: string, init: RequestInit = {}) {
  return new Request(`${publicOrigin}/api/signing/${action}`, {
    method: "POST",
    headers: { Origin: publicOrigin, "X-Sign-Action": "1" },
    body: "{}",
    ...init,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Backoffice public signing proxy", () => {
  it("rejects unrelated actions, foreign origins, missing action headers, and oversized bodies", async () => {
    const upstream = configureProxy();
    const foreignOrigin = { Origin: "https://example.test", "X-Sign-Action": "1" };

    expect((await middleware(signingRequest("admin")))?.status).toBe(403);
    expect((await middleware(signingRequest("accept", { headers: foreignOrigin })))?.status).toBe(
      403
    );
    expect(
      (await middleware(signingRequest("exchange", { headers: { Origin: publicOrigin } })))?.status
    ).toBe(403);
    expect(
      (await middleware(signingRequest("prepare", { body: "x".repeat(100001) })))?.status
    ).toBe(413);
    expect((await middleware(new Request(`${publicOrigin}/api/signing/review`)))?.status).toBe(405);
    expect(
      await middleware(new Request("https://pos.corely.one/api/signing/review"))
    ).toBeUndefined();
    expect(upstream).not.toHaveBeenCalled();
  });

  it("forwards only the signer cookie and passes through the exchange cookie with its scope", async () => {
    const upstream = configureProxy();
    const responseHeaders = new Headers();
    responseHeaders.append("Set-Cookie", setSignerCookie);
    responseHeaders.append("Set-Cookie", "other=unrelated; Path=/");
    upstream.mockResolvedValueOnce(new Response('{"ok":true}', { headers: responseHeaders }));
    const response = await middleware(
      signingRequest("exchange", {
        headers: {
          Origin: publicOrigin,
          "X-Sign-Action": "1",
          Cookie: `backoffice=private; corely_sign_session=${signerSession}`,
          Authorization: "Bearer backoffice-token",
        },
        body: '{"token":"synthetic"}',
      })
    );

    expect(upstream).toHaveBeenCalledWith(`${apiBaseUrl}/public/signing/exchange`, {
      method: "POST",
      cache: "no-store",
      redirect: "error",
      headers: {
        Origin: publicOrigin,
        "X-Sign-Action": "1",
        "Content-Type": "application/json",
        Cookie: `corely_sign_session=${signerSession}`,
      },
      body: '{"token":"synthetic"}',
    });
    expect(response?.headers.getSetCookie()).toEqual([setSignerCookie]);
    expect(response?.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response?.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(await response?.json()).toEqual({ ok: true });

    upstream.mockResolvedValueOnce(new Response("{}", { status: 403, headers: responseHeaders }));
    const unavailable = await middleware(signingRequest("review"));
    expect(unavailable?.status).toBe(403);
    expect(unavailable?.headers.getSetCookie()).toEqual([]);
  });
});
