import { describe, expect, it } from "vitest";
import { getAppManagementPolicy } from "./apps-management-policy";

describe("getAppManagementPolicy", () => {
  it("marks core as force-enabled and non-disableable", () => {
    const policy = getAppManagementPolicy("core");
    expect(policy.forceEnabled).toBe(true);
    expect(policy.hideDisableAction).toBe(true);
  });

  it("marks workspaces as force-enabled and non-disableable", () => {
    const policy = getAppManagementPolicy("workspaces");
    expect(policy.forceEnabled).toBe(true);
    expect(policy.hideDisableAction).toBe(true);
  });

  it("returns default mutable policy for regular apps", () => {
    const policy = getAppManagementPolicy("expenses");
    expect(policy.forceEnabled).toBe(false);
    expect(policy.hideDisableAction).toBe(false);
  });
});
