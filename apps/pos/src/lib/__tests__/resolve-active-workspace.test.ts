import { describe, expect, it, vi } from "vitest";
import { resolveActiveWorkspaceId } from "../resolve-active-workspace";
import type { ListWorkspacesOutput } from "@corely/contracts";

const createClient = (result: ListWorkspacesOutput) =>
  ({
    get: vi.fn().mockResolvedValue(result),
  }) as { get<T>(endpoint: string): Promise<T> };

describe("resolveActiveWorkspaceId", () => {
  it("keeps the current workspace when it is still available", async () => {
    const client = createClient({
      workspaces: [
        {
          id: "workspace-1",
          legalEntityId: "legal-1",
          name: "Workspace 1",
          kind: "COMPANY",
          onboardingStatus: "DONE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    await expect(resolveActiveWorkspaceId(client, "workspace-1")).resolves.toBe("workspace-1");
  });

  it("falls back to the first available workspace when current workspace is invalid", async () => {
    const client = createClient({
      workspaces: [
        {
          id: "workspace-a",
          legalEntityId: "legal-a",
          name: "Workspace A",
          kind: "COMPANY",
          onboardingStatus: "DONE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "workspace-b",
          legalEntityId: "legal-b",
          name: "Workspace B",
          kind: "COMPANY",
          onboardingStatus: "DONE",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    await expect(resolveActiveWorkspaceId(client, "tenant-1")).resolves.toBe("workspace-a");
  });

  it("returns the current workspace when no workspaces are available", async () => {
    const client = createClient({
      workspaces: [],
    });

    await expect(resolveActiveWorkspaceId(client, "tenant-1")).resolves.toBe("tenant-1");
  });
});
