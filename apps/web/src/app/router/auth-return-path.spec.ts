import { describe, expect, it } from "vitest";
import { authReturnPath } from "./auth-return-path";
describe("catalog sign-in restoration", () => {
  it("restores the module path and workspace intent", () => {
    expect(
      authReturnPath({
        from: { pathname: "/crm/deals", search: "?workspaceId=studio-a", hash: "" },
      })
    ).toBe("/crm/deals?workspaceId=studio-a");
  });
  it.each([
    null,
    {},
    { from: { pathname: "//evil.invalid" } },
    { from: { pathname: "/auth/login" } },
    { from: { pathname: "https://evil.invalid" } },
    { from: { pathname: "/crm", search: "//evil.invalid" } },
  ])("rejects invalid or external destinations", (state) => {
    expect(authReturnPath(state)).toBe("/");
  });
});
