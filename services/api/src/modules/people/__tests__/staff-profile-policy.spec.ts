import { describe, expect, it, vi } from "vitest";
import { staffProfileRejection } from "@corely/people/extensions";

describe("self-hosted staff profiles", () => {
  it("passes only selected facts to the configured workspace policy", () => {
    const scope = { tenantId: "tenant", workspaceId: "acme" };
    const check = vi.fn(({ team }: { team: string | null }) =>
      team ? undefined : "Choose a team."
    );
    const policies = [{ ...scope, check }];
    expect(staffProfileRejection(policies, scope, { operation: "create", team: null })).toBe(
      "Choose a team."
    );
    expect(
      staffProfileRejection(policies, scope, { operation: "update", team: "Support" })
    ).toBeUndefined();
    expect(
      staffProfileRejection(
        policies,
        { ...scope, workspaceId: "other" },
        { operation: "create", team: null }
      )
    ).toBeUndefined();
    expect(
      staffProfileRejection(
        policies,
        { ...scope, tenantId: "other" },
        { operation: "create", team: null }
      )
    ).toBeUndefined();
    expect(check.mock.calls).toEqual([
      [{ operation: "create", team: null }],
      [{ operation: "update", team: "Support" }],
    ]);
  });
});
