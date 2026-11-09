import { describe, expect, it, vi } from "vitest";
import { discoverSessionWorkspaces } from "./workspace-discovery";
import { workspaceFixtureResponse, fixtureOrigins } from "../../testkit/workspace-api-fixture";
import { SsoSessionUserSchema } from "@corely/contracts";

const origins = fixtureOrigins("5187");
async function profile() {
  return SsoSessionUserSchema.parse(
    await workspaceFixtureResponse(
      "/api/session/user",
      new Headers(),
      "user-a",
      "invoice",
      origins
    ).json()
  );
}
describe("membership-backed workspace discovery", () => {
  it("deduplicates server tenant memberships and returns only workspace-owner projections", async () => {
    const session = await profile();
    session.user.memberships.push(session.user.memberships[0]);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input, init) =>
        workspaceFixtureResponse(
          String(input),
          new Headers(init?.headers),
          "user-a",
          "invoice",
          origins
        )
      );
    const choices = await discoverSessionWorkspaces(
      session,
      "invoice",
      fetcher,
      new AbortController().signal
    );
    expect(choices.map((entry) => [entry.tenantId, entry.id])).toEqual([
      ["tenant-a", "workspace-a"],
      ["tenant-b", "workspace-b"],
    ]);
    expect(fetcher.mock.calls.filter(([path]) => path === "/api/bff/workspaces")).toHaveLength(2);
    expect(fetcher.mock.calls.some(([path]) => path === "/api/bff/invoices")).toBe(false);
  });
  it("rejects an account change before retrieving another account's choices", async () => {
    const session = await profile();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json({ ...session, user: { ...session.user, userId: "user-b" } })
      );
    await expect(
      discoverSessionWorkspaces(session, "invoice", fetcher, new AbortController().signal)
    ).rejects.toThrow("Account changed");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("cancels an outstanding verification without selecting any fallback workspace", async () => {
    const session = await profile();
    let requestSignal: AbortSignal | null | undefined;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          requestSignal = init?.signal;
          requestSignal?.addEventListener(
            "abort",
            () => reject(new DOMException("Cancelled", "AbortError")),
            { once: true }
          );
        })
    );
    const abort = new AbortController();
    const pending = discoverSessionWorkspaces(session, "invoice", fetcher, abort.signal);
    const rejection = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    abort.abort();
    await rejection;
    expect(requestSignal?.aborted).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
