import { Injectable, Inject, Optional } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { CreateWorkspaceUseCase } from "../workspaces/application/use-cases/create-workspace.usecase";
import type { WorkspaceRepositoryPort } from "../workspaces/application/ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../workspaces/application/ports/workspace-repository.port";
import { buildPermissionCatalog } from "../identity/permissions/permission-catalog";
import { TOKEN_SERVICE_TOKEN } from "../identity/application/ports/token-service.port";
import type { TokenServicePort } from "../identity/application/ports/token-service.port";
import { randomUUID, createHash } from "crypto";
import { seedPortalTestData, type SeedPortalTestDataResult } from "./seed-portal-test-data";
import {
  BILLING_PROVIDER_TEST_HOOKS,
  type BillingProviderTestHooksPort,
  type BillingProviderTestOperation,
} from "../billing";

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

export type SeedTaxFilingScenarioType = "VAT_PERIODIC" | "VAT_ANNUAL";
export type SeedTaxFilingScenarioStatus = "OPEN" | "SUBMITTED" | "PAID";

export interface SeedTaxFilingScenarioInput {
  tenantId: string;
  workspaceId: string;
  actorUserId: string;
  filingType: SeedTaxFilingScenarioType;
  year: number;
  periodKey?: string;
  withBlockers?: boolean;
  includeSnapshots?: boolean;
  invoiceCount?: number;
  expenseCount?: number;
  status?: SeedTaxFilingScenarioStatus;
}

export interface SeedTaxFilingScenarioResult {
  filingId: string;
  filingType: SeedTaxFilingScenarioType;
  filingApiType: "vat" | "vat-annual";
  periodLabel: string;
  periodKey?: string;
  year: number;
  invoiceIds: string[];
  expenseIds: string[];
  expectedTotals: {
    vatCollectedCents: number;
    vatPaidCents: number;
    netPayableCents: number;
    salesCount: number;
    purchaseCount: number;
    salesNetCents: number;
    purchaseNetCents: number;
  };
  blockerIssueCount: number;
}

export interface BillingInspectionResult {
  accounts: Array<{
    tenantId: string;
    provider: string | null;
    providerCustomerRef: string | null;
  }>;
  subscriptions: Array<{
    productKey: string;
    planCode: string;
    status: string;
    providerSubscriptionRef: string | null;
    providerPriceRef: string | null;
    cancelAtPeriodEnd: boolean;
  }>;
  usageCounters: Array<{
    productKey: string;
    metricKey: string;
    quantity: number;
    periodStart: string;
    periodEnd: string;
  }>;
  providerEventCount: number;
  providerEventTypes: string[];
  outboxEventTypes: string[];
  auditActions: string[];
}

@Injectable()
export class TestHarnessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly createWorkspaceUseCase: CreateWorkspaceUseCase,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(TOKEN_SERVICE_TOKEN)
    private readonly tokenService: TokenServicePort,
    @Optional()
    @Inject(BILLING_PROVIDER_TEST_HOOKS)
    private readonly billingProviderTestHooks?: BillingProviderTestHooksPort | null
  ) {}

  resetBillingProviderState(): void {
    this.billingProviderTestHooks?.reset();
  }

  failNextBillingProviderOperation(operation: BillingProviderTestOperation): void {
    this.billingProviderTestHooks?.failNext(operation);
  }

  async inspectBillingState(params: {
    tenantId: string;
    productKey?: string;
  }): Promise<BillingInspectionResult> {
    const [accounts, subscriptions, usageCounters, providerEvents, outboxEvents, auditLogs] =
      await Promise.all([
        this.prisma.billingAccount.findMany({
          where: { tenantId: params.tenantId },
          select: {
            tenantId: true,
            provider: true,
            providerCustomerRef: true,
          },
        }),
        this.prisma.billingSubscription.findMany({
          where: {
            tenantId: params.tenantId,
            ...(params.productKey ? { productKey: params.productKey } : {}),
          },
          orderBy: [{ createdAt: "asc" }],
          select: {
            productKey: true,
            planCode: true,
            status: true,
            providerSubscriptionRef: true,
            providerPriceRef: true,
            cancelAtPeriodEnd: true,
          },
        }),
        this.prisma.billingUsageCounter.findMany({
          where: {
            tenantId: params.tenantId,
            ...(params.productKey ? { productKey: params.productKey } : {}),
          },
          orderBy: [{ periodStart: "asc" }, { metricKey: "asc" }],
          select: {
            productKey: true,
            metricKey: true,
            quantity: true,
            periodStart: true,
            periodEnd: true,
          },
        }),
        this.prisma.billingProviderEvent.findMany({
          where: { tenantId: params.tenantId },
          orderBy: [{ createdAt: "asc" }],
          select: { eventType: true },
        }),
        this.prisma.outboxEvent.findMany({
          where: { tenantId: params.tenantId, eventType: { startsWith: "billing." } },
          orderBy: [{ createdAt: "asc" }],
          select: { eventType: true },
        }),
        this.prisma.auditLog.findMany({
          where: { tenantId: params.tenantId, action: { startsWith: "billing." } },
          orderBy: [{ createdAt: "asc" }],
          select: { action: true },
        }),
      ]);

    return {
      accounts: accounts.map((account) => ({
        tenantId: account.tenantId,
        provider: account.provider,
        providerCustomerRef: account.providerCustomerRef,
      })),
      subscriptions: subscriptions.map((subscription) => ({
        productKey: subscription.productKey,
        planCode: subscription.planCode,
        status: subscription.status,
        providerSubscriptionRef: subscription.providerSubscriptionRef,
        providerPriceRef: subscription.providerPriceRef,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      })),
      usageCounters: usageCounters.map((counter) => ({
        productKey: counter.productKey,
        metricKey: counter.metricKey,
        quantity: counter.quantity,
        periodStart: counter.periodStart.toISOString(),
        periodEnd: counter.periodEnd.toISOString(),
      })),
      providerEventCount: providerEvents.length,
      providerEventTypes: providerEvents.map((event) => event.eventType),
      outboxEventTypes: outboxEvents.map((event) => event.eventType),
      auditActions: auditLogs.map((log) => log.action),
    };
  }

  async setBillingTrialEndsAt(params: {
    tenantId: string;
    productKey?: string;
    endsAt: string;
  }): Promise<void> {
    await this.prisma.billingTrial.updateMany({
      where: {
        tenantId: params.tenantId,
        ...(params.productKey ? { productKey: params.productKey } : {}),
      },
      data: {
        endsAt: new Date(params.endsAt),
      },
    });
  }

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

        await tx.role.create({
          data: {
            tenantId: tenant.id,
            name: "Admin",
            systemKey: "ADMIN",
            isSystem: true,
          },
        });

        await tx.role.create({
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
      const workspaceNameSuffix = randomUUID().slice(0, 8);
      const uniqueWorkspaceName = `Default Workspace ${workspaceNameSuffix}`;
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

  async seedTaxFilingScenario(
    params: SeedTaxFilingScenarioInput
  ): Promise<SeedTaxFilingScenarioResult> {
    const workspaceTenantId = params.workspaceId;
    const period = this.resolveTaxPeriod(params.filingType, params.year, params.periodKey);
    await this.ensureTaxProfile(workspaceTenantId, period.start);

    const invoiceCount = Math.max(1, params.invoiceCount ?? 12);
    const expenseCount = Math.max(1, params.expenseCount ?? 6);
    const includeSnapshots = params.includeSnapshots ?? false;
    const withBlockers = params.withBlockers ?? false;
    const invoiceIds: string[] = [];
    const expenseIds: string[] = [];
    let vatCollectedCents = 0;
    let vatPaidCents = 0;
    let salesNetCents = 0;
    let purchaseNetCents = 0;

    for (let index = 0; index < invoiceCount; index += 1) {
      const net = 12_000 + index * 650;
      const tax = Math.round(net * 0.19);
      const gross = net + tax;
      const issuedAt = this.dayInPeriod(period.start, period.end, index, 9);
      const hasMissingVatTreatment = withBlockers && index === 0;
      const invoice = await this.prisma.invoice.create({
        data: {
          tenantId: workspaceTenantId,
          customerPartyId: `party-tax-invoice-${index + 1}`,
          billToName: `Tax Test Customer ${index + 1}`,
          billToEmail: `tax-customer-${index + 1}@example.com`,
          number: `E2E-TAX-${params.year}-${index + 1}`,
          status: "ISSUED",
          currency: "EUR",
          invoiceDate: issuedAt,
          dueDate: this.addDays(issuedAt, 14),
          issuedAt,
          taxSnapshot: hasMissingVatTreatment
            ? null
            : {
                subtotalAmountCents: net,
                totalTaxAmountCents: tax,
                totalAmountCents: gross,
              },
          lines: {
            create: [
              {
                description: `Tax invoice line ${index + 1}`,
                qty: 1,
                unitPriceCents: gross,
              },
            ],
          },
        },
      });

      invoiceIds.push(invoice.id);
      vatCollectedCents += tax;
      salesNetCents += net;

      if (includeSnapshots) {
        await this.createTaxSnapshotIfSupported({
          tenantId: workspaceTenantId,
          sourceType: "INVOICE",
          sourceId: invoice.id,
          jurisdiction: "DE",
          regime: "STANDARD_VAT",
          roundingMode: "PER_DOCUMENT",
          currency: "EUR",
          calculatedAt: issuedAt,
          subtotalAmountCents: net,
          taxTotalAmountCents: tax,
          totalAmountCents: gross,
          breakdownJson: JSON.stringify({
            sourceType: "INVOICE",
            net,
            tax,
            gross,
          }),
        });
      }
    }

    for (let index = 0; index < expenseCount; index += 1) {
      const net = 5_000 + index * 240;
      const tax = Math.round(net * 0.19);
      const gross = net + tax;
      const expenseDate = this.dayInPeriod(period.start, period.end, index, 14);
      const missingCategory = withBlockers && index === 0;
      const expense = await this.prisma.expense.create({
        data: {
          tenantId: workspaceTenantId,
          status: "APPROVED",
          expenseDate,
          merchantName: `Tax Supplier ${index + 1}`,
          currency: "EUR",
          notes: `E2E tax expense ${index + 1}`,
          category: missingCategory ? null : "office_supplies",
          totalAmountCents: gross,
          taxAmountCents: tax,
          createdByUserId: params.actorUserId,
        },
      });

      expenseIds.push(expense.id);
      vatPaidCents += tax;
      purchaseNetCents += net;

      if (includeSnapshots) {
        await this.createTaxSnapshotIfSupported({
          tenantId: workspaceTenantId,
          sourceType: "EXPENSE",
          sourceId: expense.id,
          jurisdiction: "DE",
          regime: "STANDARD_VAT",
          roundingMode: "PER_DOCUMENT",
          currency: "EUR",
          calculatedAt: expenseDate,
          subtotalAmountCents: net,
          taxTotalAmountCents: tax,
          totalAmountCents: gross,
          breakdownJson: JSON.stringify({
            sourceType: "EXPENSE",
            net,
            tax,
            gross,
          }),
        });
      }
    }

    const baseStatus: SeedTaxFilingScenarioStatus = params.status ?? "OPEN";
    const submissionTime = this.dayInPeriod(period.start, period.end, 3, 10);
    const paidTime = this.addDays(submissionTime, 5);

    const issues = withBlockers
      ? [
          {
            id: `tax-issue-missing-category-${randomUUID()}`,
            type: "uncategorized-expenses",
            severity: "blocker",
            title: "Uncategorized expenses",
            count: 1,
            description: "Some expenses are missing categories.",
            deepLink:
              "/expenses?filters=%5B%7B%22field%22%3A%22category%22%2C%22operator%22%3A%22isNull%22%7D%5D",
          },
          {
            id: `tax-issue-missing-vat-${randomUUID()}`,
            type: "missing-vat-treatment",
            severity: "blocker",
            title: "Missing VAT treatment / tax code",
            count: 1,
            description: "Some records are missing VAT treatment and need review.",
            deepLink:
              "/invoices?filters=%5B%7B%22field%22%3A%22taxTreatment%22%2C%22operator%22%3A%22isNull%22%7D%5D",
          },
        ]
      : [];

    const meta: Record<string, unknown> = {
      issues,
      lastRecalculatedAt: new Date(Date.UTC(params.year, 0, 15, 9, 30, 0)).toISOString(),
      paymentInstructions: {
        bankName: "Bundesbank",
        ibanMasked: "DE12 **** **** 3456",
        bic: "MARKDEF1100",
        reference: `VAT-${params.year}-${period.periodLabel}`,
      },
    };

    let reportStatus: "OPEN" | "SUBMITTED" | "PAID" = "OPEN";
    if (baseStatus === "SUBMITTED") {
      reportStatus = "SUBMITTED";
      meta.submission = {
        method: "manual",
        submissionId: `SUB-${params.year}-${period.periodLabel}`,
        submittedAt: submissionTime.toISOString(),
      };
    }
    if (baseStatus === "PAID") {
      reportStatus = "PAID";
      meta.submission = {
        method: "manual",
        submissionId: `SUB-${params.year}-${period.periodLabel}`,
        submittedAt: submissionTime.toISOString(),
      };
      meta.payment = {
        paidAt: paidTime.toISOString(),
        method: "bank-transfer",
        amountCents: vatCollectedCents - vatPaidCents,
      };
    }

    const netPayableCents = vatCollectedCents - vatPaidCents;
    const report = await this.prisma.taxReport.create({
      data: {
        tenantId: workspaceTenantId,
        type: period.reportType,
        group: period.reportGroup,
        periodLabel: period.periodLabel,
        periodStart: period.start,
        periodEnd: period.end,
        dueDate: period.dueDate,
        status: reportStatus,
        amountEstimatedCents: netPayableCents,
        amountFinalCents: reportStatus === "PAID" ? netPayableCents : null,
        currency: "EUR",
        submittedAt: reportStatus === "OPEN" ? null : submissionTime,
        submissionReference:
          reportStatus === "OPEN" ? null : `SUB-${params.year}-${period.periodLabel}`,
        submissionNotes: reportStatus === "OPEN" ? null : "Seeded by test harness",
        meta: meta as Prisma.InputJsonValue,
      },
    });
    return {
      filingId: report.id,
      filingType: params.filingType,
      filingApiType: params.filingType === "VAT_PERIODIC" ? "vat" : "vat-annual",
      periodLabel: period.periodLabel,
      periodKey: period.periodKey,
      year: params.year,
      invoiceIds,
      expenseIds,
      expectedTotals: {
        vatCollectedCents,
        vatPaidCents,
        netPayableCents,
        salesCount: invoiceIds.length,
        purchaseCount: expenseIds.length,
        salesNetCents,
        purchaseNetCents,
      },
      blockerIssueCount: issues.length,
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
    const workspaceRows = await this.prisma.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const scopeTenantIds = Array.from(new Set([tenantId, ...workspaceRows.map((row) => row.id)]));
    // Keep deletes non-transactional so one missing legacy table/column does not abort all cleanup.
    const deleteOperations: Array<() => Promise<unknown>> = [
      () => this.prisma.outboxEvent.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.domainEvent.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.auditLog.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.idempotencyKey.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxDocumentLink.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxFilingEvent.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxReportLine.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxReport.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () =>
        this.prisma.vatPeriodSummary.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxSnapshot.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxRate.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxCode.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxConsultant.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.taxProfile.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.documentLink.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.file.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.document.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () =>
        this.prisma.billingProviderEvent.deleteMany({
          where: { tenantId: { in: scopeTenantIds } },
        }),
      () =>
        this.prisma.billingUsageCounter.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () =>
        this.prisma.billingSubscription.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.billingAccount.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () =>
        this.prisma.invoicePayment.deleteMany({
          where: { invoice: { tenantId: { in: scopeTenantIds } } },
        }),
      () =>
        this.prisma.invoiceLine.deleteMany({
          where: { invoice: { tenantId: { in: scopeTenantIds } } },
        }),
      () => this.prisma.invoice.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.expenseLine.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.expense.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () =>
        this.prisma.workflowInstance.deleteMany({
          where: { definition: { tenantId: { in: scopeTenantIds } } },
        }),
      () =>
        this.prisma.workflowDefinition.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () => this.prisma.partyRole.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
      () =>
        this.prisma.contactPoint.deleteMany({
          where: { party: { tenantId: { in: scopeTenantIds } } },
        }),
      () =>
        this.prisma.address.deleteMany({ where: { party: { tenantId: { in: scopeTenantIds } } } }),
      () => this.prisma.party.deleteMany({ where: { tenantId: { in: scopeTenantIds } } }),
    ];

    for (const deleteOperation of deleteOperations) {
      try {
        await deleteOperation();
      } catch (error) {
        if (!this.isMissingSchemaError(error)) {
          throw error;
        }
      }
    }

    this.billingProviderTestHooks?.reset();
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
      } catch {
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

  private resolveTaxPeriod(
    filingType: SeedTaxFilingScenarioType,
    year: number,
    periodKey?: string
  ): {
    reportType: "VAT_ADVANCE" | "VAT_ANNUAL";
    reportGroup: "ADVANCE_VAT" | "ANNUAL_REPORT";
    periodLabel: string;
    periodKey?: string;
    start: Date;
    end: Date;
    dueDate: Date;
  } {
    if (filingType === "VAT_PERIODIC") {
      const key = periodKey ?? `${year}-Q1`;
      const quarterMatch = key.match(/^(\d{4})-Q([1-4])$/u);
      if (!quarterMatch) {
        throw new Error(`Invalid VAT periodic periodKey: ${key}`);
      }
      const quarter = Number(quarterMatch[2]);
      const startMonth = (quarter - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, startMonth + 3, 1, 0, 0, 0, 0));
      const dueDate = new Date(Date.UTC(year, startMonth + 3, 10, 0, 0, 0, 0));
      return {
        reportType: "VAT_ADVANCE",
        reportGroup: "ADVANCE_VAT",
        periodLabel: `Q${quarter} ${year}`,
        periodKey: key,
        start,
        end,
        dueDate,
      };
    }

    const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 0));
    const dueDate = new Date(Date.UTC(year, 11, 10, 0, 0, 0, 0));
    return {
      reportType: "VAT_ANNUAL",
      reportGroup: "ANNUAL_REPORT",
      periodLabel: String(year),
      start,
      end,
      dueDate,
    };
  }

  private dayInPeriod(start: Date, end: Date, index: number, hourUtc: number): Date {
    const rangeDays = Math.max(
      1,
      Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) - 1
    );
    const dayOffset = index % rangeDays;
    return new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + dayOffset,
        hourUtc,
        0,
        0,
        0
      )
    );
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  private async ensureTaxProfile(tenantId: string, effectiveFrom: Date): Promise<void> {
    const existing = await this.prisma.taxProfile.findFirst({
      where: { tenantId },
      orderBy: { effectiveFrom: "desc" },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    await this.prisma.taxProfile.create({
      data: {
        tenantId,
        country: "DE",
        regime: "STANDARD_VAT",
        vatEnabled: true,
        vatId: "DE999999999",
        currency: "EUR",
        filingFrequency: "QUARTERLY",
        vatAccountingMethod: "IST",
        taxYearStartMonth: 1,
        localTaxOfficeName: "Finanzamt Berlin",
        usesTaxAdvisor: false,
        effectiveFrom,
      },
    });
  }

  private async createTaxSnapshotIfSupported(data: Prisma.TaxSnapshotCreateInput): Promise<void> {
    try {
      await this.prisma.taxSnapshot.create({ data });
    } catch (error) {
      if (!this.isMissingSchemaError(error)) {
        throw error;
      }
    }
  }

  private isMissingSchemaError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }
    const maybeCode = "code" in error ? (error as { code?: string }).code : undefined;
    return maybeCode === "P2021" || maybeCode === "P2022";
  }
}
