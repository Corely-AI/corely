import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import * as bcrypt from "bcrypt";
import { CreateWorkspaceUseCase } from "../workspaces/application/use-cases/create-workspace.usecase";
import type { WorkspaceRepositoryPort } from "../workspaces/application/ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../workspaces/application/ports/workspace-repository.port";
import { buildPermissionCatalog } from "../identity/permissions/permission-catalog";
import { TOKEN_SERVICE_TOKEN } from "../identity/application/ports/token-service.port";
import type { TokenServicePort } from "../identity/application/ports/token-service.port";
import { randomUUID, createHash } from "crypto";

export interface SeedResult {
  tenantId: string;
  tenantName: string;
  userId: string;
  userName: string;
  email: string;
}

export interface DrainResult {
  processedCount: number;
  failedCount: number;
}

@Injectable()
export class TestHarnessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: TokenServicePort
  ) {}

  async loginAsPortalUser(params: {
    email: string;
    tenantId: string;
    workspaceId: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const emailNormalized = params.email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: {
        email: emailNormalized,
        memberships: { some: { tenantId: params.tenantId } },
      },
    });

    if (!user) {
      throw new Error(`User with email ${params.email} not found in tenant ${params.tenantId}`);
    }

    const membership = await this.prisma.membership.findFirst({
      where: { tenantId: params.tenantId, userId: user.id },
    });

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.id,
      email: emailNormalized,
      tenantId: params.tenantId,
      roleIds: membership ? [membership.roleId] : [],
    });

    const refreshToken = randomUUID();
    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const sessionId = randomUUID();
    const now = new Date();

    await this.prisma.portalSession.create({
      data: {
        id: sessionId,
        tenantId: params.tenantId,
        workspaceId: params.workspaceId,
        userId: user.id,
        refreshTokenHash,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Seed complete portal test data for E2E testing
   */
  async seedPortalTestData(): Promise<{
    tenantId: string;
    workspaceId: string;
    workspaceSlug: string;
    studentUserId: string;
    studentEmail: string;
    documentTitle: string;
    documentId: string;
  }> {
    const timestamp = Date.now();
    const studentEmail = `portal-student-${timestamp}@test.com`;
    const documentTitle = `E2E Test Material ${timestamp}`;
    const workspaceSlug = `portal-ws-${timestamp}`;

    // 1. Create Tenant
    const tenant = await this.prisma.tenant.create({
      data: {
        name: `Portal E2E Tenant ${timestamp}`,
        slug: `portal-e2e-${timestamp}`,
        status: "ACTIVE",
      },
    });

    // 2. Create Legal Entity and Workspace
    const legalEntity = await this.prisma.legalEntity.create({
      data: {
        tenantId: tenant.id,
        kind: "COMPANY",
        legalName: "Portal Test Company",
        countryCode: "US",
        currency: "USD",
      },
    });

    const workspace = await this.prisma.workspace.create({
      data: {
        tenantId: tenant.id,
        name: "Portal Test Workspace",
        slug: workspaceSlug,
        publicEnabled: true,
        legalEntityId: legalEntity.id,
      },
    });

    // 3. Create Student User
    const passwordHash = await bcrypt.hash("TestPassword123!", 10);
    const user = await this.prisma.user.create({
      data: {
        email: studentEmail,
        name: "E2E Test Student",
        passwordHash,
        status: "ACTIVE",
      },
    });

    // 4. Create Party and PartyRole (STUDENT)
    const party = await this.prisma.party.create({
      data: {
        tenantId: tenant.id,
        displayName: "E2E Test Student",
        lifecycleStatus: "ACTIVE",
      },
    });

    await this.prisma.partyRole.create({
      data: {
        tenantId: tenant.id,
        partyId: party.id,
        role: "STUDENT",
      },
    });

    // 5. Link User to Party
    await this.prisma.user.update({
      where: { id: user.id },
      data: { partyId: party.id },
    });

    // 6. Create Role and Membership
    const role = await this.prisma.role.create({
      data: {
        tenantId: tenant.id,
        name: "Portal User",
        systemKey: "PORTAL_USER",
        isSystem: true,
      },
    });

    await this.prisma.membership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: role.id,
      },
    });

    // 7. Create Class Group
    const classGroup = await this.prisma.classGroup.create({
      data: {
        tenantId: tenant.id,
        workspaceId: workspace.id,
        name: "E2E Test Class",
        subject: "Testing",
        level: "Beginner",
        status: "ACTIVE",
        defaultPricePerSession: 100,
        currency: "USD",
      },
    });

    // 8. Create Class Enrollment
    await this.prisma.classEnrollment.create({
      data: {
        tenantId: tenant.id,
        workspaceId: workspace.id,
        classGroupId: classGroup.id,
        studentClientId: party.id,
        payerClientId: party.id,
        isActive: true,
      },
    });

    // 9. Create Document, File, and Link to Class
    const document = await this.prisma.document.create({
      data: {
        tenantId: tenant.id,
        title: documentTitle,
        type: "UPLOAD",
        status: "READY",
      },
    });

    await this.prisma.file.create({
      data: {
        tenantId: tenant.id,
        documentId: document.id,
        kind: "ORIGINAL",
        storageProvider: "gcs",
        bucket: "e2e-test-bucket",
        objectKey: `e2e/${tenant.id}/${document.id}/test-material.pdf`,
        contentType: "application/pdf",
        sizeBytes: 1024,
      },
    });

    await this.prisma.documentLink.create({
      data: {
        tenantId: tenant.id,
        documentId: document.id,
        entityType: "CLASS_GROUP",
        entityId: classGroup.id,
      },
    });

    return {
      tenantId: tenant.id,
      workspaceId: workspace.id,
      workspaceSlug,
      studentUserId: user.id,
      studentEmail,
      documentTitle,
      documentId: document.id,
    };
  }

  /**
   * Create a test tenant with user, roles, permissions, and workspace
   *
   * Note: We use workspace use cases for workspace creation, then directly
   * update onboardingStatus to "DONE" via repository for test data setup.
   */
  async seedTestData(params: {
    email: string;
    password: string;
    tenantName: string;
  }): Promise<SeedResult> {
    // Use bcrypt to hash password (should match API's password hasher)
    const passwordHash = await bcrypt.hash(params.password, 10);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Create tenant
        const tenant = await tx.tenant.create({
          data: {
            name: params.tenantName,
            slug: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            status: "ACTIVE",
          },
        });

        // 2. Create user
        // Allow repeated seeds with the same email by upserting the user
        const user = await tx.user.upsert({
          where: { email: params.email },
          update: {
            name: "Test User",
            passwordHash,
            status: "ACTIVE",
          },
          create: {
            email: params.email,
            name: "Test User",
            passwordHash,
            status: "ACTIVE",
          },
        });

        // 3. Create default roles (OWNER, ADMIN, MEMBER)
        const ownerRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: "Owner",
            systemKey: "OWNER",
            isSystem: true,
          },
        });

        const _adminRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: "Admin",
            systemKey: "ADMIN",
            isSystem: true,
          },
        });

        const _memberRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: "Member",
            systemKey: "MEMBER",
            isSystem: true,
          },
        });

        // 4. Assign all catalog permissions to OWNER role
        const permissionKeys = buildPermissionCatalog().flatMap((group) =>
          group.permissions.map((permission) => permission.key)
        );

        if (permissionKeys.length > 0) {
          await tx.rolePermissionGrant.createMany({
            data: permissionKeys.map((permissionKey) => ({
              tenantId: tenant.id,
              roleId: ownerRole.id,
              permissionKey,
              effect: "ALLOW",
              createdBy: user.id,
            })),
          });
        }

        // 5. Create membership: user = OWNER of tenant
        await tx.membership.create({
          data: {
            tenantId: tenant.id,
            userId: user.id,
            roleId: ownerRole.id,
          },
        });

        return {
          tenantId: tenant.id,
          tenantName: tenant.name,
          userId: user.id,
          userName: user.name || "Test User",
          email: user.email,
        };
      });

      // 7. Create workspace with completed onboarding using use case
      const workspaceResult = await this.createWorkspaceUseCase.execute({
        tenantId: result.tenantId,
        userId: result.userId,
        name: "Default Workspace",
        kind: "PERSONAL",
        legalName: params.tenantName,
        countryCode: "DE",
        currency: "EUR",
        taxId: `TEST-${Date.now()}`,
        address: {
          line1: "123 Test Street",
          line2: undefined,
          city: "Test City",
          postalCode: "12345",
          countryCode: "DE",
        },
      });

      // 8. Update workspace to completed onboarding status using repository
      await this.workspaceRepo.updateWorkspace(result.tenantId, workspaceResult.workspace.id, {
        onboardingStatus: "DONE",
        onboardingCompletedAt: new Date(),
      });

      return result;
    } catch (error) {
      console.error("Error seeding test data:", error);
      throw error;
    }
  }

  /**
   * Reset tenant-scoped data: clear all business entities, keep tenant/user/roles
   */
  async resetTenantData(tenantId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete in reverse order of foreign key dependencies
      await tx.outboxEvent.deleteMany({ where: { tenantId } });
      await tx.domainEvent.deleteMany({ where: { tenantId } });
      await tx.auditLog.deleteMany({ where: { tenantId } });
      await tx.idempotencyKey.deleteMany({ where: { tenantId } });
      await tx.invoicePayment.deleteMany({ where: { invoice: { tenantId } } });
      await tx.invoiceLine.deleteMany({ where: { invoice: { tenantId } } });
      await tx.invoice.deleteMany({ where: { tenantId } });
      await tx.expense.deleteMany({ where: { tenantId } });
      await tx.workflowInstance.deleteMany({
        where: { definition: { tenantId } },
      });
      await tx.workflowDefinition.deleteMany({ where: { tenantId } });
      // Delete party-related data (customers/suppliers)
      await tx.partyRole.deleteMany({ where: { tenantId } });
      await tx.contactPoint.deleteMany({ where: { party: { tenantId } } });
      await tx.address.deleteMany({ where: { party: { tenantId } } });
      await tx.party.deleteMany({ where: { tenantId } });
    });
  }

  /**
   * Process all pending outbox events once (deterministically)
   */
  async drainOutbox(): Promise<DrainResult> {
    let processedCount = 0;
    let failedCount = 0;

    // Fetch all pending outbox events
    const pendingEvents = await this.prisma.outboxEvent.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
    });

    for (const event of pendingEvents) {
      try {
        // In a real scenario, this would publish to a message bus or call handlers
        // For now, we just mark as SENT to simulate processing
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "SENT",
            attempts: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        processedCount++;
      } catch (_error) {
        // Mark as failed if processing errors
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        failedCount++;
      }
    }

    return { processedCount, failedCount };
  }
}
