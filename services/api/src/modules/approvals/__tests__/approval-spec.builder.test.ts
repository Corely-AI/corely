import { describe, expect, it } from "vitest";
import { buildApprovalWorkflowSpec } from "../application/approval-spec.builder";

const policy = {
  key: "approval.purchasing.vendorBill.post",
  name: "Vendor bill approval",
  steps: [
    { name: "Finance review", assigneeRoleId: "role-finance" },
    { name: "Controller review", assigneeUserId: "user-ctrl" },
  ],
};

describe("buildApprovalWorkflowSpec", () => {
  it("creates sequential approval steps", () => {
    const spec = buildApprovalWorkflowSpec(policy as any);

    expect(spec.initial).toBe("start");
    expect(spec.states.step_1).toBeDefined();
    expect(spec.states.step_2).toBeDefined();
    expect(spec.states.approved).toBeDefined();

    const startTransition = spec.states.start.on?.APPROVAL_REQUESTED;
    expect(startTransition?.actions?.[0]?.task?.assigneeRoleId).toBe("role-finance");

    const step1Approve = spec.states.step_1.on?.STEP_1_APPROVED;
    expect(step1Approve?.actions?.[0]?.task?.assigneeUserId).toBe("user-ctrl");
  });

  it("persists policy metadata in spec", () => {
    const spec = buildApprovalWorkflowSpec(policy as any);
    expect(spec.meta?.policy?.steps?.length).toBe(2);
    expect(spec.context?.policyKey).toBe(policy.key);
  });
});
