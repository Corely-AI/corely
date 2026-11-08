import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { EnvService, validateEnv } from "@corely/config";
import { isSafeSsoReturnPath } from "@corely/contracts";
import { SsoRegistrationService } from "../application/services/sso-registration.service";
import { SsoHttpSecurity } from "../adapters/http/sso-http-security";
import { SsoCrypto, ssoChallenge } from "../infrastructure/security/sso-crypto";

const registration = JSON.stringify({
  loginOrigin: "https://login.corely.test",
  apps: [{ key: "app-center", origin: "https://app.corely.test" }],
});
function config(overrides: Record<string, string> = {}) {
  return new SsoRegistrationService(
    new EnvService(
      validateEnv({
        DATABASE_URL: "postgresql://unused/unused",
        CORELY_SSO_ENABLED: "true",
        CORELY_SSO_SECRET: "ab".repeat(32),
        CORELY_SSO_PROXY_KEY: "synthetic-proxy-key-384-long-enough",
        CORELY_SSO_REGISTRATIONS: registration,
        ...overrides,
      })
    )
  );
}
function request(headers: Request["headers"], encrypted = true): Request {
  return { headers, socket: { encrypted } } as unknown as Request;
}
describe("native SSO security primitives", () => {
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f/evil.test",
    "/%252f/evil.test",
    "/%0aevil",
    "/auth/callback",
    "/x/../auth/callback",
    "/api/session/login",
    "/sso/authorize",
    "/bad%escape",
  ])("rejects unsafe destination %s", (path) => {
    expect(isSafeSsoReturnPath(path)).toBe(false);
  });
  it.each(["/", "/invoices/123?view=due#items", "/people/me"])(
    "keeps safe destination %s",
    (path) => expect(isSafeSsoReturnPath(path)).toBe(true)
  );
  it("matches the RFC S256 vector and binds encrypted state to its transaction", () => {
    expect(ssoChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
    );
    const crypto = new SsoCrypto("ab".repeat(32));
    const value = crypto.encrypt("synthetic-verifier", "tx-a");
    expect(crypto.decrypt(value, "tx-a")).toBe("synthetic-verifier");
    expect(() => crypto.decrypt(value, "tx-b")).toThrow();
  });
  it("requires exact HTTPS registrations with unique origins and app keys", () => {
    expect(() =>
      config({ CORELY_SSO_REGISTRATIONS: registration.replace("https://app.", "http://app.") })
    ).toThrow();
    expect(() =>
      config({
        CORELY_SSO_REGISTRATIONS: JSON.stringify({
          loginOrigin: "https://login.corely.test",
          apps: [{ key: "app-center", origin: "https://login.corely.test" }],
        }),
      })
    ).toThrow();
    expect(() => config({ CORELY_SSO_SECRET: "" })).toThrow();
  });
  it("defaults off and rejects all SSO routes without valid enabled configuration", () => {
    const disabled = new SsoRegistrationService(
      new EnvService(validateEnv({ DATABASE_URL: "postgresql://unused/unused" }))
    );
    expect(disabled.enabled).toBe(false);
    expect(() => disabled.assertEnabled()).toThrow();
  });
  it("ignores spoofed forwarded hosts and requires authenticated proxy metadata", () => {
    const security = new SsoHttpSecurity(config(), new SsoCrypto("ab".repeat(32)));
    expect(() =>
      security.origin(request({ host: "evil.test", "x-forwarded-host": "app.corely.test" }))
    ).toThrow();
    expect(() =>
      security.origin(
        request({
          "x-corely-sso-origin": "https://app.corely.test",
          "x-corely-sso-proxy-key": "wrong",
        })
      )
    ).toThrow();
    expect(
      security.origin(
        request(
          {
            "x-corely-sso-origin": "https://app.corely.test",
            "x-corely-sso-proxy-key": "synthetic-proxy-key-384-long-enough",
          },
          false
        )
      )
    ).toBe("https://app.corely.test");
    expect(() =>
      security.mutation(request({ host: "app.corely.test", origin: "https://evil.corely.test" }))
    ).toThrow();
    expect(() => security.origin(request({ host: "app.corely.test" }, false))).toThrow();
    expect(() =>
      security.cookie(
        request({ cookie: "__Host-corely-session=a; __Host-corely-session=b" }),
        "__Host-corely-session"
      )
    ).toThrow();
  });
});
