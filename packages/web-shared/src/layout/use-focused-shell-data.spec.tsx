import React from "react";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { SessionContext, type BrowserSessionContext } from "../session/session-context";
import { SessionClient } from "../session/session-client";
import { useFocusedShellData } from "./use-focused-shell-data";
import { shellConfig } from "../../testkit/browser/focused-shell-fixture";

afterEach(cleanup);
function setup(workspaceId: string) {
  const context: BrowserSessionContext = mockDeep<BrowserSessionContext>();
  context.client = new SessionClient({ appKey: "invoice", tenantId: "tenant", workspaceId });
  context.state = {
    status: "authenticated",
    session: {
      appKey: "invoice",
      csrfToken: "a".repeat(43),
      expiresAt: "2099-01-01T00:00:00Z",
      user: { userId: "user", name: "Alex", email: "alex@example.invalid", memberships: [] },
    },
  };
  const request = vi
    .spyOn(context.client, "json")
    .mockImplementation(async (path, schema) =>
      schema.parse(path === "/menu/launches" ? [] : shellConfig("invoice"))
    );
  const queries = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SessionContext.Provider value={context}>
      <QueryClientProvider client={queries}>{children}</QueryClientProvider>
    </SessionContext.Provider>
  );
  return { request, queries, wrapper };
}
describe("focused shell transport", () => {
  it("does not request data against an unbound workspace hint", () => {
    const f = setup("other-workspace");
    const { result } = renderHook(() => useFocusedShellData("invoice", "synthetic-workspace"), {
      wrapper: f.wrapper,
    });
    expect(result.current.ready).toBe(false);
    expect(f.request).not.toHaveBeenCalled();
  });
  it("loads scoped navigation and staff launches with identity-specific query keys", async () => {
    const f = setup("synthetic-workspace");
    const { result } = renderHook(() => useFocusedShellData("invoice", "synthetic-workspace"), {
      wrapper: f.wrapper,
    });
    await waitFor(() => expect(result.current.navigation.isSuccess).toBe(true));
    expect(f.request.mock.calls.map((call) => call[0])).toEqual([
      "/workspaces/synthetic-workspace/config?scope=web&launchId=invoice",
      "/menu/launches",
    ]);
    expect(
      f.queries
        .getQueryCache()
        .getAll()
        .map((entry) => entry.queryKey)
    ).toEqual([
      ["focused-shell-navigation", "user", "tenant", "synthetic-workspace", "invoice"],
      ["focused-shell-launches", "user", "tenant", "synthetic-workspace", "invoice"],
    ]);
  });
});
