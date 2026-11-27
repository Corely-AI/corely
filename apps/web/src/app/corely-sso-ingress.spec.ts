// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import middleware from "../../middleware";
import { CORELY_APP_ORIGIN } from "./corely-app-origin";

const origin = CORELY_APP_ORIGIN;
const proxyKey = "test-ingress-key-for-cli-routing-only";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Corely production CLI sign-in ingress", () => {
  it("forwards the CLI start request and sets trusted ingress headers server-side", async () => {
    vi.stubEnv("CORELY_SSO_PROXY_KEY", proxyKey);
    const fetchUpstream = vi.fn(async (url: URL, options: RequestInit) => {
      const request = new Request(url, options);
      expect(request.url).toBe("https://api.corely.one/sso/cli/start");
      expect(request.method).toBe("POST");
      expect(request.headers.get("x-corely-sso-origin")).toBe(origin);
      expect(request.headers.get("x-corely-sso-proxy-key")).toBe(proxyKey);
      expect(request.headers.get("x-forwarded-host")).toBeNull();
      expect(await request.json()).toEqual({ port: 44123 });
      return Response.json({ redirectTo: `${origin}/sso/authorize?request=example` });
    });
    vi.stubGlobal("fetch", fetchUpstream);

    const response = await middleware(
      new Request(`${origin}/sso/cli/start`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-corely-sso-origin": "https://caller.example",
          "x-corely-sso-proxy-key": "caller-controlled-key",
          "x-forwarded-host": "caller.example",
        },
        body: JSON.stringify({ port: 44123 }),
      })
    );
    expect(fetchUpstream).toHaveBeenCalledOnce();
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({
      redirectTo: `${origin}/sso/authorize?request=example`,
    });
  });

  it("preserves the browser request, session cookies, and loopback redirect", async () => {
    vi.stubEnv("CORELY_SSO_PROXY_KEY", proxyKey);
    const cookie = "__Host-corely-login=session; Path=/; Secure; HttpOnly; SameSite=Lax";
    const location = "http://127.0.0.1:44123/auth/callback?state=example";
    const fetchUpstream = vi.fn(async (url: URL, options: RequestInit) => {
      const request = new Request(url, options);
      expect(request.url).toBe("https://api.corely.one/sso/cli/consent?request=example");
      expect(request.redirect).toBe("manual");
      expect(request.headers.get("origin")).toBe(origin);
      expect(request.headers.get("cookie")).toBe("__Host-corely-login=session");
      expect((await request.formData()).get("request")).toBe("example");
      return new Response(null, { status: 303, headers: { location, "set-cookie": cookie } });
    });
    vi.stubGlobal("fetch", fetchUpstream);

    const response = await middleware(
      new Request(`${origin}/sso/cli/consent?request=example`, {
        method: "POST",
        headers: { origin, cookie: "__Host-corely-login=session" },
        body: new URLSearchParams({ request: "example" }),
      })
    );
    expect(response?.status).toBe(303);
    expect(response?.headers.get("location")).toBe(location);
    expect(response?.headers.getSetCookie()).toEqual([cookie]);
    expect(response?.headers.get("cache-control")).toBe("no-store");
  });

  it("preserves the CLI bearer credential and an empty logout response", async () => {
    vi.stubEnv("CORELY_SSO_PROXY_KEY", proxyKey);
    const fetchUpstream = vi.fn(async (_url: URL, options: RequestInit) => {
      expect(new Headers(options.headers).get("authorization")).toBe("Bearer cli-fixture");
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchUpstream);

    const response = await middleware(
      new Request(`${origin}/sso/cli/logout`, {
        method: "POST",
        headers: { authorization: "Bearer cli-fixture" },
      })
    );
    expect(response?.status).toBe(204);
    expect(response?.body).toBeNull();
  });

  it("keeps unrelated routes and hosts outside the privileged ingress", async () => {
    vi.stubEnv("CORELY_SSO_PROXY_KEY", proxyKey);
    const fetchUpstream = vi.fn();
    vi.stubGlobal("fetch", fetchUpstream);

    for (const url of [
      "https://pos.corely.one/sso/cli/start",
      "https://corely-web-example.vercel.app/sso/context",
      `${origin}/auth/login`,
      `${origin}/api/invoices`,
      `${origin}/sso/cli/../../api/session/login`,
    ]) {
      expect(await middleware(new Request(url))).toBeUndefined();
    }
    expect(fetchUpstream).not.toHaveBeenCalled();
  });

  it("fails closed when the proxy key is absent", async () => {
    vi.stubEnv("CORELY_SSO_PROXY_KEY", undefined);
    const fetchUpstream = vi.fn();
    vi.stubGlobal("fetch", fetchUpstream);

    const response = await middleware(new Request(`${origin}/sso/context`));
    expect(response?.status).toBe(503);
    expect(fetchUpstream).not.toHaveBeenCalled();
  });
});
