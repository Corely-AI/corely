import { describe, expect, it, vi } from "vitest";
const deps = vi.hoisted(() => ({
  workspace: "workspace-a" as string | null,
  request: vi.fn(async () => ({})),
}));
vi.mock("@corely/web-shared/lib/api-client", () => ({ apiClient: { request: deps.request } }));
vi.mock("@corely/web-shared/shared/workspaces/workspace-store", () => ({
  getActiveWorkspaceId: () => deps.workspace,
}));
import { peopleApi, createPeopleApi } from "./people-api";
describe("People request scope", () => {
  it("pins the current workspace before asynchronous token refresh and preserves the command key", async () => {
    deps.workspace = "workspace-a";
    const pending = peopleApi.command("", "POST", { displayName: "Anna" }, "retry-key");
    deps.workspace = "workspace-b";
    await pending;
    expect(deps.request).toHaveBeenLastCalledWith(
      "/people/staff",
      expect.objectContaining({
        headers: { "Content-Type": "application/json", "X-Workspace-Id": "workspace-a" },
      }),
      expect.objectContaining({ workspaceScope: "none", idempotencyKey: "retry-key" })
    );
  });
  it("rejects unscoped requests before dispatch", async () => {
    deps.workspace = null;
    deps.request.mockClear();
    await expect(peopleApi.detail("staff", false, new AbortController().signal)).rejects.toThrow(
      "Workspace required"
    );
    expect(deps.request).not.toHaveBeenCalled();
  });
});

describe("Focused People request adapter", () => {
  it("leaves identity headers to the scoped session and preserves the retry key", async () => {
    deps.request.mockClear();
    const focused = createPeopleApi({ request: deps.request }, () => "workspace-a", true);
    await focused.command("/staff-id", "PATCH", { displayName: "Updated" }, "same-retry-key");
    expect(deps.request).toHaveBeenCalledWith(
      "/people/staff/staff-id",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
      expect.objectContaining({ workspaceScope: "active", idempotencyKey: "same-retry-key" })
    );
  });
});
