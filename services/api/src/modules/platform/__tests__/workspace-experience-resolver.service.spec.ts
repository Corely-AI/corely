import { describe, expect, it, vi } from "vitest";
import { WorkspaceExperienceResolverService } from "../application/services/workspace-experience-resolver.service";
import { WorkspaceTemplateService } from "../application/services/workspace-template.service";
import { TenantEntitlementService } from "../application/services/tenant-entitlement.service";
import { TenantEntitlement } from "../domain/entitlement.aggregate";
import type { WorkspaceRepositoryPort } from "../../workspaces/application/ports/workspace-repository.port";

describe("WorkspaceExperienceResolverService", () => {
  it("resolves POS vertical from workspace configuration", async () => {
    const entitlementService = {
      getTenantEntitlement: vi.fn(
        async () => new TenantEntitlement("tenant-1", new Set(), new Set())
      ),
    } as unknown as TenantEntitlementService;
    const workspaceRepo: WorkspaceRepositoryPort = {
      createLegalEntity: vi.fn(),
      getLegalEntityById: vi.fn(),
      updateLegalEntity: vi.fn(),
      createWorkspace: vi.fn(),
      getWorkspaceBySlug: vi.fn(),
      getWorkspaceById: vi.fn(),
      getWorkspaceByIdWithLegalEntity: vi.fn(async () => ({
        id: "ws-1",
        tenantId: "tenant-1",
        legalEntityId: "le-1",
        name: "Restaurant Workspace",
        verticalId: "restaurant",
        onboardingStatus: "PROFILE",
        createdAt: new Date(),
        updatedAt: new Date(),
        legalEntity: {
          id: "le-1",
          tenantId: "tenant-1",
          kind: "COMPANY",
          legalName: "Restaurant Workspace GmbH",
          countryCode: "DE",
          currency: "EUR",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })),
      listWorkspacesByTenant: vi.fn(),
      updateWorkspace: vi.fn(),
      softDeleteWorkspace: vi.fn(),
      createMembership: vi.fn(),
      getMembershipByUserAndWorkspace: vi.fn(),
      listMembershipsByWorkspace: vi.fn(),
      checkUserHasWorkspaceAccess: vi.fn(),
      listWorkspaceDomains: vi.fn(),
      createWorkspaceDomain: vi.fn(),
      deleteWorkspaceDomain: vi.fn(),
      setPrimaryWorkspaceDomain: vi.fn(),
    };

    const service = new WorkspaceExperienceResolverService(
      entitlementService,
      new WorkspaceTemplateService(),
      workspaceRepo
    );

    const result = await service.resolve({
      tenantId: "tenant-1",
      userId: "user-1",
      workspaceId: "ws-1",
      surfaceId: "pos",
      permissions: ["cash.read"],
    });

    expect(result.surfaceId).toBe("pos");
    expect(result.verticalId).toBe("restaurant");
    expect(result.workspaceKind).toBe("COMPANY");
    expect(result.permissions.has("cash.read")).toBe(true);
  });
});
