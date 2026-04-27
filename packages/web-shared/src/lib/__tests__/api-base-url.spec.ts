import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "../api-base-url";

describe("resolveApiBaseUrl", () => {
  it("uses the local proxy for POS localhost hosts even with a local explicit API URL", () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: "http://localhost:3000",
        isDev: true,
        browserHostname: "pos.localhost",
      })
    ).toBe("/api");
  });

  it("uses the local proxy for CRM localhost hosts even with a local explicit API URL", () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: "http://127.0.0.1:3000",
        isDev: true,
        browserHostname: "crm.localhost",
      })
    ).toBe("/api");
  });

  it("keeps the explicit API URL on plain localhost", () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: "http://localhost:3000",
        isDev: true,
        browserHostname: "localhost",
      })
    ).toBe("http://localhost:3000");
  });
});
