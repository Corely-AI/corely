import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  WorkspaceRepositoryPort,
  CreateLegalEntityInput,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateLegalEntityInput,
  CreateMembershipInput,
} from "../../application/ports/workspace-repository.port";
import type {
  Workspace,
  WorkspaceMembership,
  LegalEntity,
  WorkspaceDomain,
} from "../../domain/workspace.entity";

@Injectable()
export class PrismaWorkspaceRepository implements WorkspaceRepositoryPort {
  constructor(@Inject(PrismaService) private prisma: PrismaService | null) {
    // Fallback for test environments where DI might not inject PrismaService
    this.prisma = this.prisma ?? new PrismaService();
  }

  // === Legal Entity Operations ===

  async createLegalEntity(input: CreateLegalEntityInput): Promise<LegalEntity> {
    const entity = await this.prisma.legalEntity.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        kind: input.kind,
        legalName: input.legalName,
        countryCode: input.countryCode,
        currency: input.currency,
        taxId: input.taxId,
        vatId: input.vatId,
        phone: input.phone,
        email: input.email,
        website: input.website,
        address: input.address || null,
        bankAccount: input.bankAccount || null,
      },
    });

    return this.mapLegalEntityFromPrisma(entity);
  }

  async getLegalEntityById(tenantId: string, id: string): Promise<LegalEntity | null> {
    const entity = await this.prisma.legalEntity.findFirst({
      where: { id, tenantId },
    });

    return entity ? this.mapLegalEntityFromPrisma(entity) : null;
  }

  async updateLegalEntity(
    tenantId: string,
    id: string,
    input: UpdateLegalEntityInput
  ): Promise<LegalEntity> {
    const entity = await this.prisma.legalEntity.update({
      where: { id },
      data: {
        kind: input.kind,
        legalName: input.legalName,
        countryCode: input.countryCode,
        currency: input.currency,
        taxId: input.taxId,
        vatId: input.vatId,
        phone: input.phone,
        email: input.email,
        website: input.website,
        address: input.address,
        bankAccount: input.bankAccount,
      },
    });

    return this.mapLegalEntityFromPrisma(entity);
  }

  // === Workspace Operations ===

  async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    const workspace = await this.prisma.workspace.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        legalEntityId: input.legalEntityId,
        name: input.name,
        slug: input.slug,
        publicEnabled: input.publicEnabled ?? false,
        publicModules: input.publicModules ?? null,
        onboardingStatus: (input.onboardingStatus || "NEW") as any,
        invoiceSettings: input.invoiceSettings || null,
      },
    });

    return this.mapWorkspaceFromPrisma(workspace);
  }

  async getWorkspaceBySlug(slug: string): Promise<Workspace | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { slug, deletedAt: null } as any,
    });

    return workspace ? this.mapWorkspaceFromPrisma(workspace) : null;
  }

  async getWorkspaceById(tenantId: string, id: string): Promise<Workspace | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, tenantId, deletedAt: null } as any,
    });

    return workspace ? this.mapWorkspaceFromPrisma(workspace) : null;
  }

  async getWorkspaceByIdWithLegalEntity(tenantId: string, id: string): Promise<Workspace | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, tenantId, deletedAt: null } as any,
      include: { legalEntity: true },
    });

    if (!workspace) {
      return null;
    }

    const mapped = this.mapWorkspaceFromPrisma(workspace);
    if ((workspace as any).legalEntity) {
      mapped.legalEntity = this.mapLegalEntityFromPrisma((workspace as any).legalEntity);
    }

    return mapped;
  }

  async listWorkspacesByTenant(tenantId: string, userId: string): Promise<Workspace[]> {
    // Get workspaces where user has active membership
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        tenantId,
        memberships: {
          some: {
            userId,
            status: "ACTIVE",
          },
        },
        deletedAt: null,
      } as any,
      include: { legalEntity: true },
      orderBy: { createdAt: "desc" },
    });

    return workspaces.map((ws: any) => {
      const mapped = this.mapWorkspaceFromPrisma(ws);
      if (ws.legalEntity) {
        mapped.legalEntity = this.mapLegalEntityFromPrisma(ws.legalEntity);
      }
      return mapped;
    });
  }

  async updateWorkspace(
    tenantId: string,
    id: string,
    input: UpdateWorkspaceInput
  ): Promise<Workspace> {
    const workspace = await this.prisma.workspace.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        publicEnabled: input.publicEnabled,
        publicModules: input.publicModules,
        onboardingStatus: input.onboardingStatus as any,
        onboardingCompletedAt: input.onboardingCompletedAt,
        invoiceSettings: input.invoiceSettings,
      },
    });

    return this.mapWorkspaceFromPrisma(workspace);
  }

  async softDeleteWorkspace(tenantId: string, id: string): Promise<void> {
    await (this.prisma!.workspace as any).update({
      where: { id, tenantId },
      data: {
        deletedAt: new Date(),
        slug: null, // Free up the slug when deleted
      },
    });
  }

  // === Membership Operations ===

  async createMembership(input: CreateMembershipInput): Promise<WorkspaceMembership> {
    const membership = await this.prisma.workspaceMembership.create({
      data: {
        id: input.id,
        workspaceId: input.workspaceId,
        userId: input.userId,
        role: input.role as any,
        status: (input.status || "ACTIVE") as any,
      },
    });

    return this.mapMembershipFromPrisma(membership);
  }

  async getMembershipByUserAndWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMembership | null> {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    return membership ? this.mapMembershipFromPrisma(membership) : null;
  }

  async listMembershipsByWorkspace(workspaceId: string): Promise<WorkspaceMembership[]> {
    const memberships = await this.prisma.workspaceMembership.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map(this.mapMembershipFromPrisma);
  }

  async checkUserHasWorkspaceAccess(
    tenantId: string,
    workspaceId: string,
    userId: string
  ): Promise<boolean> {
    const count = await this.prisma.workspaceMembership.count({
      where: {
        workspaceId,
        userId,
        status: "ACTIVE",
      },
    });

    return count > 0;
  }

  // === Workspace Domain Operations ===

  async listWorkspaceDomains(workspaceId: string): Promise<WorkspaceDomain[]> {
    const domains = await this.prisma.workspaceDomain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    return domains.map(this.mapWorkspaceDomainFromPrisma);
  }

  async createWorkspaceDomain(input: {
    id: string;
    workspaceId: string;
    domain: string;
    isPrimary: boolean;
  }): Promise<WorkspaceDomain> {
    const domain = await this.prisma.workspaceDomain.create({
      data: {
        id: input.id,
        workspaceId: input.workspaceId,
        domain: input.domain,
        isPrimary: input.isPrimary,
      },
    });

    return this.mapWorkspaceDomainFromPrisma(domain);
  }

  async deleteWorkspaceDomain(workspaceId: string, domainId: string): Promise<boolean> {
    const result = await this.prisma.workspaceDomain.deleteMany({
      where: { workspaceId, id: domainId },
    });

    return result.count > 0;
  }

  async setPrimaryWorkspaceDomain(
    workspaceId: string,
    domainId: string
  ): Promise<WorkspaceDomain | null> {
    const [_, updateResult, updated] = await this.prisma.$transaction([
      this.prisma.workspaceDomain.updateMany({
        where: { workspaceId },
        data: { isPrimary: false },
      }),
      this.prisma.workspaceDomain.updateMany({
        where: { id: domainId, workspaceId },
        data: { isPrimary: true },
      }),
      this.prisma.workspaceDomain.findUnique({
        where: { id: domainId },
      }),
    ]);

    if (!updateResult.count || !updated || updated.workspaceId !== workspaceId) {
      return null;
    }

    return this.mapWorkspaceDomainFromPrisma(updated);
  }

  // === Mappers ===

  private mapLegalEntityFromPrisma(entity: any): LegalEntity {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      kind: entity.kind,
      legalName: entity.legalName,
      countryCode: entity.countryCode,
      currency: entity.currency,
      taxId: entity.taxId || undefined,
      vatId: entity.vatId || undefined,
      phone: entity.phone || undefined,
      email: entity.email || undefined,
      website: entity.website || undefined,
      address: entity.address || undefined,
      bankAccount: entity.bankAccount || undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private mapWorkspaceFromPrisma(workspace: any): Workspace {
    return {
      id: workspace.id,
      tenantId: workspace.tenantId,
      legalEntityId: workspace.legalEntityId,
      name: workspace.name,
      slug: workspace.slug ?? undefined,
      publicEnabled: workspace.publicEnabled ?? false,
      publicModules: (workspace.publicModules as Record<string, boolean> | null) ?? undefined,
      onboardingStatus: workspace.onboardingStatus,
      onboardingCompletedAt: workspace.onboardingCompletedAt || undefined,
      invoiceSettings: workspace.invoiceSettings || undefined,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      deletedAt: workspace.deletedAt || undefined,
    };
  }

  private mapMembershipFromPrisma(membership: any): WorkspaceMembership {
    return {
      id: membership.id,
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt,
    };
  }

  private mapWorkspaceDomainFromPrisma(domain: any): WorkspaceDomain {
    return {
      id: domain.id,
      workspaceId: domain.workspaceId,
      domain: domain.domain,
      isPrimary: domain.isPrimary,
      createdAt: domain.createdAt,
    };
  }
}
