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

  it("forces local surface hosts back through the dev proxy when override points remote", () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: "https://api.corely.one",
        isDev: true,
        browserHostname: "pos.localhost",
      })
    ).toBe("/api");
  });

  it("keeps local overrides for local surface hosts", () => {
    expect(
      resolveApiBaseUrl({
        apiBaseUrl: "http://localhost:3000",
        isDev: true,
        browserHostname: "crm.localhost",
      })
    ).toBe("http://localhost:3000");
  });
});
