/**
 * OSS Mode Workspace Store Tests
 * Verifies that workspace store locks to default tenant in OSS mode
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
  loadActiveWorkspaceId,
} from "../workspace-store";

// Mock features module
vi.mock("@/lib/features", () => ({
  features: {
    multiTenant: false,
    defaultTenantId: "default_tenant",
    defaultWorkspaceId: "default_workspace",
    edition: "oss",
  },
}));

describe("Workspace Store - OSS Mode", () => {
  beforeEach(() => {
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
  });

  it("should always return default workspace in OSS mode", () => {
    const workspaceId = getActiveWorkspaceId();
    expect(workspaceId).toBe("default_workspace");
  });

  it("should ignore attempts to set different workspace in OSS mode", () => {
    setActiveWorkspaceId("different_workspace");
    const workspaceId = getActiveWorkspaceId();
    expect(workspaceId).toBe("default_workspace");
  });

  it("should ignore localStorage values in OSS mode", () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("corely-active-workspace", "stored_workspace");
    }
    const workspaceId = loadActiveWorkspaceId();
    expect(workspaceId).toBe("default_workspace");
  });

  it("should not write to localStorage in OSS mode", () => {
    setActiveWorkspaceId("different_workspace");
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("corely-active-workspace");
      // Should either be null or default tenant, not the attempted value
      expect(stored).not.toBe("different_workspace");
    }
  });
});
