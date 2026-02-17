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
import { seedPortalTestData, type SeedPortalTestDataResult } from "./seed-portal-test-data";

export interface SeedResult {
  tenantId: string;
  tenantName: string;
  workspaceId: string;
  userId: string;
  userName: string;
  email: string;
}

export interface DrainResult {
  processedCount: number;
  failedCount: number;
}

export interface SeedCopilotThreadMessageResult {
  threadId: string;
  messageId: string;
  title: string;
}

export interface SeedClassesBillingSendResult {
  tenantId: string;
  workspaceId: string;
  month: string;
  invoiceIds: string[];
  recipients: string[];
}

export interface InvoiceEmailDeliveryLookup {
  invoiceId: string;
  to: string;
  status: string;
  provider: string;
  providerMessageId: string | null;
  lastError: string | null;
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
  async seedPortalTestData(): Promise<SeedPortalTestDataResult> {
    return seedPortalTestData(this.prisma);
  }

  async seedCopilotThreadMessage(params: {
    tenantId: string;
    userId: string;
    title: string;
    messageText: string;
  }): Promise<SeedCopilotThreadMessageResult> {
    const now = new Date();
    const thread = await this.prisma.agentRun.create({
      data: {
        tenantId: params.tenantId,
        createdByUserId: params.userId,
        title: params.title,
        status: "completed",
        startedAt: now,
        finishedAt: now,
        lastMessageAt: now,
      },
      select: {
        id: true,
        title: true,
      },
    });

    const message = await this.prisma.message.create({
      data: {
        tenantId: params.tenantId,
        runId: thread.id,
        role: "user",
        partsJson: JSON.stringify({
          parts: [{ type: "text", text: params.messageText }],
        }),
        contentText: params.messageText,
      },
      select: {
        id: true,
      },
    });

    return {
      threadId: thread.id,
      messageId: message.id,
      title: thread.title ?? "New chat",
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

        // 6. Enable classes app for seeded tenant so assistant E2E can access classes tools.
        await tx.tenantFeatureOverride.upsert({
          where: {
            tenantId_featureKey: {
              tenantId: tenant.id,
              featureKey: "app.classes.enabled",
            },
          },
          create: {
            tenantId: tenant.id,
            featureKey: "app.classes.enabled",
            valueJson: JSON.stringify(true),
            updatedBy: user.id,
          },
          update: {
            valueJson: JSON.stringify(true),
            updatedBy: user.id,
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
      const uniqueWorkspaceName = `Default Workspace ${result.tenantId.slice(0, 8)}`;
      const workspaceResult = await this.createWorkspaceUseCase.execute({
        tenantId: result.tenantId,
        userId: result.userId,
        name: uniqueWorkspaceName,
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

      return {
        ...result,
        workspaceId: workspaceResult.workspace.id,
      };
    } catch (error) {
      console.error("Error seeding test data:", error);
      throw error;
    }
  }

  async seedClassesBillingSendScenario(params: {
    tenantId: string;
    workspaceId: string;
    actorUserId: string;
    month?: string;
    label?: string;
  }): Promise<SeedClassesBillingSendResult> {
    const now = new Date();
    const month =
      params.month ?? `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const suffix = params.label?.trim() || `${Date.now()}`;
    const recipientA = `delivered+classes-a-${suffix}@resend.dev`;
    const recipientB = `delivered+classes-b-${suffix}@resend.dev`;

    const [partyA, partyB] = await this.prisma.$transaction(async (tx) => {
      const createdPartyA = await tx.party.create({
        data: {
          tenantId: params.tenantId,
          displayName: `E2E Student A ${suffix}`,
          lifecycleStatus: "ACTIVE",
        },
      });

      const createdPartyB = await tx.party.create({
        data: {
          tenantId: params.tenantId,
          displayName: `E2E Student B ${suffix}`,
          lifecycleStatus: "ACTIVE",
        },
      });

      await tx.partyRole.createMany({
        data: [
          { tenantId: params.tenantId, partyId: createdPartyA.id, role: "CUSTOMER" },
          { tenantId: params.tenantId, partyId: createdPartyB.id, role: "CUSTOMER" },
        ],
      });

      await tx.contactPoint.createMany({
        data: [
          {
            tenantId: params.tenantId,
            partyId: createdPartyA.id,
            type: "EMAIL",
            value: recipientA,
            isPrimary: true,
          },
          {
            tenantId: params.tenantId,
            partyId: createdPartyB.id,
            type: "EMAIL",
            value: recipientB,
            isPrimary: true,
          },
        ],
      });

      return [createdPartyA, createdPartyB];
    });

    const invoiceA = await this.prisma.invoice.create({
      data: {
        tenantId: params.tenantId,
        customerPartyId: partyA.id,
        billToName: partyA.displayName,
        billToEmail: recipientA,
        number: `E2E-CLS-${Date.now()}-A`,
        status: "ISSUED",
        currency: "USD",
        invoiceDate: now,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        lines: {
          create: [{ description: "E2E Class Tuition A", qty: 1, unitPriceCents: 15000 }],
        },
      },
      select: { id: true },
    });

    const invoiceB = await this.prisma.invoice.create({
      data: {
        tenantId: params.tenantId,
        customerPartyId: partyB.id,
        billToName: partyB.displayName,
        billToEmail: recipientB,
        number: `E2E-CLS-${Date.now()}-B`,
        status: "ISSUED",
        currency: "USD",
        invoiceDate: now,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        lines: {
          create: [{ description: "E2E Class Tuition B", qty: 1, unitPriceCents: 17000 }],
        },
      },
      select: { id: true },
    });

    const [yearPart, monthPart] = month.split("-").map((part) => Number(part));
    const monthIndex = Math.max(0, monthPart - 1);
    const sessionAStart = new Date(Date.UTC(yearPart, monthIndex, 10, 9, 0, 0));
    const sessionBStart = new Date(Date.UTC(yearPart, monthIndex, 11, 9, 0, 0));
    const enrollmentStartDate = new Date(Date.UTC(yearPart, monthIndex, 1));

    const classGroupA = await this.prisma.classGroup.create({
      data: {
        tenantId: params.tenantId,
        workspaceId: params.workspaceId,
        name: `E2E Class A ${suffix}`,
        subject: "Math",
        level: "A1",
        defaultPricePerSession: 15000,
        currency: "USD",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    const classGroupB = await this.prisma.classGroup.create({
      data: {
        tenantId: params.tenantId,
        workspaceId: params.workspaceId,
        name: `E2E Class B ${suffix}`,
        subject: "Science",
        level: "A1",
        defaultPricePerSession: 17000,
        currency: "USD",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    await this.prisma.classSession.createMany({
      data: [
        {
          tenantId: params.tenantId,
          workspaceId: params.workspaceId,
          classGroupId: classGroupA.id,
          startsAt: sessionAStart,
          status: "PLANNED",
        },
        {
          tenantId: params.tenantId,
          workspaceId: params.workspaceId,
          classGroupId: classGroupB.id,
          startsAt: sessionBStart,
          status: "PLANNED",
        },
      ],
    });

    await this.prisma.classEnrollment.createMany({
      data: [
        {
          tenantId: params.tenantId,
          workspaceId: params.workspaceId,
          classGroupId: classGroupA.id,
          studentClientId: partyA.id,
          payerClientId: partyA.id,
          isActive: true,
          priceOverridePerSession: 15000,
          startDate: enrollmentStartDate,
        },
        {
          tenantId: params.tenantId,
          workspaceId: params.workspaceId,
          classGroupId: classGroupB.id,
          studentClientId: partyB.id,
          payerClientId: partyB.id,
          isActive: true,
          priceOverridePerSession: 17000,
          startDate: enrollmentStartDate,
        },
      ],
    });

    const seededSnapshot = {
      billMonth: month,
      seededBy: "test-harness",
      seededAt: now.toISOString(),
      strategy: "PREPAID_CURRENT_MONTH",
      basis: "SCHEDULED_SESSIONS",
      items: [
        {
          payerClientId: partyA.id,
          totalSessions: 1,
          totalAmountCents: 15000,
          currency: "USD",
          lines: [
            {
              classGroupId: classGroupA.id,
              classGroupName: `E2E Class A ${suffix}`,
              sessions: 1,
              priceCents: 15000,
              amountCents: 15000,
              currency: "USD",
            },
          ],
        },
        {
          payerClientId: partyB.id,
          totalSessions: 1,
          totalAmountCents: 17000,
          currency: "USD",
          lines: [
            {
              classGroupId: classGroupB.id,
              classGroupName: `E2E Class B ${suffix}`,
              sessions: 1,
              priceCents: 17000,
              amountCents: 17000,
              currency: "USD",
            },
          ],
        },
      ],
    };

    const billingRun = await this.prisma.classMonthlyBillingRun.upsert({
      where: {
        tenantId_month: {
          tenantId: params.tenantId,
          month,
        },
      },
      create: {
        tenantId: params.tenantId,
        workspaceId: params.workspaceId,
        month,
        billingMonthStrategy: "PREPAID_CURRENT_MONTH",
        billingBasis: "SCHEDULED_SESSIONS",
        billingSnapshot: seededSnapshot,
        status: "INVOICES_CREATED",
        runId: randomUUID(),
        generatedAt: now,
        createdByUserId: params.actorUserId,
      },
      update: {
        workspaceId: params.workspaceId,
        billingMonthStrategy: "PREPAID_CURRENT_MONTH",
        billingBasis: "SCHEDULED_SESSIONS",
        status: "INVOICES_CREATED",
        billingSnapshot: seededSnapshot,
        updatedAt: now,
      },
      select: { id: true },
    });

    await this.prisma.classBillingInvoiceLink.createMany({
      data: [
        {
          tenantId: params.tenantId,
          workspaceId: params.workspaceId,
          billingRunId: billingRun.id,
          payerClientId: partyA.id,
          invoiceId: invoiceA.id,
          idempotencyKey: `e2e-billing-link-${billingRun.id}-${partyA.id}-${Date.now()}`,
        },
        {
          tenantId: params.tenantId,
          workspaceId: params.workspaceId,
          billingRunId: billingRun.id,
          payerClientId: partyB.id,
          invoiceId: invoiceB.id,
          idempotencyKey: `e2e-billing-link-${billingRun.id}-${partyB.id}-${Date.now() + 1}`,
        },
      ],
    });

    return {
      tenantId: params.tenantId,
      workspaceId: params.workspaceId,
      month,
      invoiceIds: [invoiceA.id, invoiceB.id],
      recipients: [recipientA, recipientB],
    };
  }

  async listInvoiceEmailDeliveries(params: {
    tenantId: string;
    invoiceIds: string[];
  }): Promise<InvoiceEmailDeliveryLookup[]> {
    if (params.invoiceIds.length === 0) {
      return [];
    }
    const rows = await this.prisma.invoiceEmailDelivery.findMany({
      where: {
        tenantId: params.tenantId,
        invoiceId: { in: params.invoiceIds },
      },
      orderBy: { createdAt: "desc" },
      select: {
        invoiceId: true,
        to: true,
        status: true,
        provider: true,
        providerMessageId: true,
        lastError: true,
      },
    });
    return rows.map((row) => ({
      invoiceId: row.invoiceId,
      to: row.to,
      status: row.status,
      provider: row.provider,
      providerMessageId: row.providerMessageId ?? null,
      lastError: row.lastError ?? null,
    }));
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
