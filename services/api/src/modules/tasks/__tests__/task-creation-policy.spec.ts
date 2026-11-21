import { describe, expect, it, vi } from "vitest";
import { taskCreationRejection } from "@corely/tasks/extensions";

describe("self-hosted manual tasks", () => {
  it("applies optional due-date validation only in the configured scope", () => {
    const scope = { tenantId: "tenant", workspaceId: "acme" };
    const check = vi.fn(({ dueAt }: { dueAt: string | null }) =>
      dueAt ? undefined : "Enter a due date."
    );
    const policies = [{ ...scope, check }];
    expect(taskCreationRejection(policies, scope, { dueAt: null })).toBe("Enter a due date.");
    expect(
      taskCreationRejection(policies, scope, { dueAt: "2026-11-22T09:00:00Z" })
    ).toBeUndefined();
    expect(
      taskCreationRejection(policies, { ...scope, workspaceId: "other" }, { dueAt: null })
    ).toBeUndefined();
    expect(
      taskCreationRejection(policies, { ...scope, tenantId: "other" }, { dueAt: null })
    ).toBeUndefined();
    expect(check.mock.calls).toEqual([[{ dueAt: null }], [{ dueAt: "2026-11-22T09:00:00Z" }]]);
  });
});
