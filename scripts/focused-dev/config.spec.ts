import { describe, expect, it } from "vitest";
import { parseFocusedDevEnv } from "../../packages/config/src/focused-surfaces";
import { exampleEnv as example, validEnv } from "./test-fixture";
describe("focused local configuration", () => {
  it("derives exact callbacks and server registrations without exposing server settings", () => {
    const config = parseFocusedDevEnv(validEnv);
    expect(config.callbacks.invoice).toBe("https://invoice.app.corely.test:8443/auth/callback");
    expect(JSON.parse(config.apiEnv.CORELY_SSO_REGISTRATIONS).apps).toHaveLength(3);
    expect(JSON.stringify(config.browser)).not.toContain(validEnv.CORELY_SSO_SECRET);
    expect(JSON.stringify(config.browser)).not.toContain(validEnv.CORELY_SSO_PROXY_KEY);
    expect(Object.keys(config.browser)).toHaveLength(5);
  });
  it("refuses example placeholders", () => {
    expect(() => parseFocusedDevEnv(example)).toThrow();
  });
  it.each([
    "VITE_DATABASE_URL",
    "VITE_CLIENT_SECRET",
    "VITE_CORELY_SSO_PROXY_KEY",
    "VITE_ARBITRARY",
  ])("refuses unexpected browser variable %s", (key) => {
    expect(() => parseFocusedDevEnv({ ...validEnv, [key]: "private" })).toThrow(
      "Unsupported browser variable"
    );
  });
  it.each([
    ["VITE_CORELY_LOGIN_ORIGIN", "http://login.corely.test:8443"],
    ["VITE_CORELY_LOGIN_ORIGIN", "https://login.corely.test:8443/path"],
    ["VITE_CORELY_LOGIN_ORIGIN", "https://user:password@login.corely.test:8443"],
    ["VITE_CORELY_INVOICE_ORIGIN", "https://invoice.app.corely.test:8444"],
    ["VITE_CORELY_INVOICE_ORIGIN", "https://hr.app.corely.test:8443"],
    ["CORELY_DEV_API_ORIGIN", "http://remote.example:3000"],
    ["CORELY_DEV_API_ORIGIN", "http://127.0.0.1:3000/path"],
  ])("refuses invalid setting %s=%s", (key, value) => {
    expect(() => parseFocusedDevEnv({ ...validEnv, [key]: value })).toThrow();
  });
  it("requires every app destination instead of guessing", () => {
    expect(() => parseFocusedDevEnv({ ...validEnv, VITE_CORELY_HR_ORIGIN: undefined })).toThrow();
  });
});
