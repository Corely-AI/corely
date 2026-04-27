import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "@corely/web-shared/lib/api-base-url";

describe("resolveApiBaseUrl", () => {
  it("defaults to the Vite proxy in dev", () => {
    expect(resolveApiBaseUrl({ isDev: true })).toBe("/api");
  });

  it("prefers explicit API base URL overrides", () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: "http://localhost:3000",
        apiUrl: "/ignored",
        isDev: true,
      })
    ).toBe("http://localhost:3000");
  });

  it("falls back to absolute localhost outside dev when no override exists", () => {
    expect(resolveApiBaseUrl({ isDev: false })).toBe("http://localhost:3000");
  });

  it("keeps remote overrides for local surface hosts", () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: "https://api.corely.one",
        isDev: true,
        browserHostname: "pos.localhost",
      })
    ).toBe("https://api.corely.one");
  });

  it("forces local overrides for local surface hosts back through the dev proxy", () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: "http://localhost:3000",
        isDev: true,
        browserHostname: "crm.localhost",
      })
    ).toBe("/api");
  });
});
