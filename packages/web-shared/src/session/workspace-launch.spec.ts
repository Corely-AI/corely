import { describe, expect, it } from "vitest";
import {
  buildWorkspaceDeepLink,
  readWorkspaceHint,
  sessionScopeQueryKey,
} from "./workspace-launch";
const origins = {
  "app-center": "https://app.corely.one",
  invoice: "https://invoice.app.corely.one/",
  hr: "https://hr.app.corely.one",
};
describe("workspace launch intent", () => {
  it.each(["app-center", "invoice", "hr"] as const)(
    "preserves a workspace and safe relative route for %s",
    (app) => {
      const link = buildWorkspaceDeepLink(
        app,
        origins,
        "workspace-a",
        "/invoices/record-1?tab=history#events"
      );
      const url = new URL(link ?? "https://invalid.local");
      expect(url.origin).toBe(new URL(origins[app]).origin);
      expect(url.pathname).toBe("/invoices/record-1");
      expect(url.searchParams.get("workspaceId")).toBe("workspace-a");
      expect(url.hash).toBe("#events");
    }
  );
  it.each([
    "//evil.test",
    "https://evil.test",
    "/api/session/user",
    "/invoices/../auth/login",
    "/invoices/%2e%2e/people",
    "/invoices?tenantId=foreign",
    "/invoices?access_token=secret",
    "/invoices?workspaceId=other",
    "/invoices?csrfToken=secret",
    "/invoices#access_token=secret",
  ])("rejects unsafe route %s", (route) => {
    expect(buildWorkspaceDeepLink("invoice", origins, "workspace-a", route)).toBeUndefined();
  });
  it("rejects missing destinations and non-origin configurations", () => {
    expect(buildWorkspaceDeepLink("hr", {}, "workspace-a")).toBeUndefined();
    expect(
      buildWorkspaceDeepLink("invoice", { invoice: "https://app.test/path" }, "workspace-a")
    ).toBeUndefined();
  });
  it("distinguishes absent, malformed, duplicated and requested hints without selecting a fallback", () => {
    expect(readWorkspaceHint("")).toEqual({ kind: "absent" });
    expect(readWorkspaceHint("?workspaceId=workspace-a")).toEqual({
      kind: "requested",
      workspaceId: "workspace-a",
    });
    for (const search of [
      "?workspaceId=",
      "?workspaceId=a&workspaceId=b",
      "?workspaceId=%2Fother",
    ]) {
      expect(readWorkspaceHint(search)).toEqual({ kind: "invalid" });
    }
  });
  it("partitions query identity by account, tenant, workspace and app", () => {
    const scope = {
      userId: "a",
      tenantId: "team-a",
      workspaceId: "workspace-a",
      appKey: "invoice" as const,
    };
    const keys = [
      scope,
      { ...scope, userId: "b" },
      { ...scope, tenantId: "team-b" },
      { ...scope, workspaceId: "workspace-b" },
      { ...scope, appKey: "hr" as const },
    ].map((entry) => JSON.stringify(sessionScopeQueryKey(entry, "records", { page: 1 })));
    expect(new Set(keys).size).toBe(5);
  });
});
