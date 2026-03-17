import { describe, expect, it, vi } from "vitest";
import { CashManagementProductKey } from "@corely/contracts";
import type { AuditPort, OutboxPort, TransactionContext, UnitOfWorkPort } from "@corely/kernel";
import { BillingAccessService } from "../application/billing-access.service";
import type { BillingProviderPort } from "../application/ports/billing-provider.port";
import type {
  BillingAccountRecord,
  BillingAccountRepoPort,
  BillingProviderEventRepoPort,
  BillingSubscriptionRecord,
  BillingSubscriptionRepoPort,
  BillingTenantProfile,
  BillingTrialRecord,
  BillingTrialRepoPort,
  BillingUsageCounterRecord,
  BillingUsageRepoPort,
} from "../application/ports/billing-repository.port";

class InMemoryBillingRepo
  implements
    BillingAccountRepoPort,
    BillingSubscriptionRepoPort,
    BillingTrialRepoPort,
    BillingUsageRepoPort,
    BillingProviderEventRepoPort
{
  account: BillingAccountRecord | null = null;
  subscription: BillingSubscriptionRecord | null = null;
  trial: BillingTrialRecord | null = null;
  usage: BillingUsageCounterRecord[] = [];
  workspaceCount = 1;

  async findAccountByTenantId(): Promise<BillingAccountRecord | null> {
    return this.account;
  }

  async upsertAccount(input: {
    tenantId: string;
    provider: "stripe" | null;
    providerCustomerRef?: string | null;
    billingCurrency?: string;
    email?: string | null;
  }): Promise<BillingAccountRecord> {
    this.account = {
      id: this.account?.id ?? "account-1",
      tenantId: input.tenantId,
      provider: input.provider,
      providerCustomerRef: input.providerCustomerRef ?? this.account?.providerCustomerRef ?? null,
      billingCurrency: input.billingCurrency ?? this.account?.billingCurrency ?? "EUR",
      email: input.email ?? this.account?.email ?? null,
      createdAt: this.account?.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date(),
    };
    return this.account;
  }

  async getTenantProfile(tenantId: string): Promise<BillingTenantProfile> {
    return {
      tenantId,
      name: "Tenant",
      primaryEmail: "owner@example.com",
      workspaceCount: this.workspaceCount,
    };
  }

  async findSubscriptionByTenantId(): Promise<BillingSubscriptionRecord | null> {
    return this.subscription;
  }

  async listSubscriptionsByTenantId(): Promise<BillingSubscriptionRecord[]> {
    return this.subscription ? [this.subscription] : [];
  }

  async findByProviderSubscriptionRef(): Promise<BillingSubscriptionRecord | null> {
    return this.subscription;
  }

  async upsertSubscription(
    input: Omit<BillingSubscriptionRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<BillingSubscriptionRecord> {
    this.subscription = {
      id: this.subscription?.id ?? "subscription-1",
      createdAt: this.subscription?.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date(),
      ...input,
    };
    return this.subscription;
  }

  async findTrialByTenantId(): Promise<BillingTrialRecord | null> {
    return this.trial;
  }

  async listTrialsEndingBefore(endsBefore: Date): Promise<BillingTrialRecord[]> {
    return this.trial &&
      this.trial.status === "active" &&
      this.trial.endsAt.getTime() <= endsBefore.getTime()
      ? [this.trial]
      : [];
  }

  async upsertTrial(
    input: Omit<BillingTrialRecord, "id" | "createdAt" | "updatedAt">
  ): Promise<BillingTrialRecord> {
    this.trial = {
      id: this.trial?.id ?? "trial-1",
      createdAt: this.trial?.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date(),
      ...input,
    };
    return this.trial;
  }

  async listUsage(): Promise<BillingUsageCounterRecord[]> {
    return this.usage;
  }

  async incrementUsage(input: {
    tenantId: string;
    productKey: string;
    metricKey: string;
    periodStart: Date;
    periodEnd: Date;
    quantity: number;
  }): Promise<void> {
    const existing = this.usage.find(
      (item) =>
        item.tenantId === input.tenantId &&
        item.productKey === input.productKey &&
        item.metricKey === input.metricKey &&
        item.periodStart.getTime() === input.periodStart.getTime() &&
        item.periodEnd.getTime() === input.periodEnd.getTime()
    );
    if (existing) {
      existing.quantity += input.quantity;
      existing.updatedAt = new Date();
      return;
    }

    this.usage.push({
      id: `usage-${this.usage.length + 1}`,
      tenantId: input.tenantId,
      productKey: input.productKey,
      metricKey: input.metricKey,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      quantity: input.quantity,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async findByExternalEventId() {
    return null;
  }

  async createEvent() {
    return {
      id: "event-1",
      tenantId: "tenant-1",
      accountId: "account-1",
      provider: "stripe" as const,
      externalEventId: "evt_1",
      eventType: "customer.subscription.updated",
      payloadJson: {},
      status: "received" as const,
      errorMessage: null,
      processedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async markProcessed(): Promise<void> {}

  async markFailed(): Promise<void> {}

  async markIgnored(): Promise<void> {}
}

const provider: BillingProviderPort = {
  ensureCustomer: async () => ({ customerRef: "cus_123" }),
  createCheckoutSession: async () => ({
    sessionId: "cs_123",
    checkoutUrl: "https://example.com/checkout",
  }),
  createPortalSession: async () => ({
    portalUrl: "https://example.com/portal",
  }),
  fetchSubscriptionSnapshot: async () => null,
  verifyAndParseWebhook: () => ({
    provider: "stripe",
    eventId: "evt_1",
    eventType: "customer.subscription.updated",
    customerRef: "cus_123",
    subscriptionRef: "sub_123",
    tenantId: "tenant-1",
    productKey: CashManagementProductKey,
    rawPayload: {},
  }),
};

const audit: AuditPort = {
  log: vi.fn(async () => {}),
};

const outbox: OutboxPort = {
  enqueue: vi.fn(async () => {}),
};

const unitOfWork: UnitOfWorkPort = {
  withinTransaction: async <T>(fn: (tx: TransactionContext) => Promise<T>) =>
    fn({} as TransactionContext),
};

const createService = (repo: InMemoryBillingRepo) =>
  new BillingAccessService(repo, repo, repo, repo, repo, provider, audit, outbox, unitOfWork);

describe("BillingAccessService trial support", () => {
  it("starts a full-access trial and resolves trial entitlements", async () => {
    const repo = new InMemoryBillingRepo();
    const service = createService(repo);

    const result = await service.startTrial("tenant-1", "user-1", {
      productKey: CashManagementProductKey,
      source: "billing-page",
    });

    expect(result.subscription.entitlementSource).toBe("trial");
    expect(result.subscription.planCode).toBe("multi-location-monthly");
    expect(result.subscription.status).toBe("trialing");
    expect(result.trial.status).toBe("active");
    expect(result.trial.daysRemaining).toBeGreaterThanOrEqual(29);
    expect(result.entitlements.featureValues["cash-management.teamAccess"]).toBe(true);
  });

  it("rejects a second trial after the first one has expired", async () => {
    const repo = new InMemoryBillingRepo();
    const service = createService(repo);

    await service.startTrial("tenant-1", "user-1", {
      productKey: CashManagementProductKey,
    });
    if (!repo.trial) {
      throw new Error("expected trial");
    }
    repo.trial.endsAt = new Date("2026-01-01T00:00:00.000Z");

    await service.expireDueTrials();

    await expect(
      service.startTrial("tenant-1", "user-1", {
        productKey: CashManagementProductKey,
      })
    ).rejects.toThrow(/already used/i);
  });

  it("expires a trial into a fresh free period and reports over-entitlement", async () => {
    const repo = new InMemoryBillingRepo();
    repo.workspaceCount = 2;
    const service = createService(repo);

    await service.startTrial("tenant-1", "user-1", {
      productKey: CashManagementProductKey,
    });
    if (!repo.trial) {
      throw new Error("expected trial");
    }
    repo.trial.endsAt = new Date("2026-01-01T00:00:00.000Z");

    const expiredCount = await service.expireDueTrials();
    const subscription = await service.getSubscription("tenant-1", CashManagementProductKey);
    const upgradeContext = await service.getUpgradeContext("tenant-1", CashManagementProductKey);

    expect(expiredCount).toBe(1);
    expect(subscription.entitlementSource).toBe("free");
    expect(subscription.planCode).toBe("free");
    expect(subscription.currentPeriodStart).not.toBeNull();
    expect(subscription.currentPeriodEnd).not.toBeNull();
    expect(upgradeContext.isOverEntitlement).toBe(true);
    expect(upgradeContext.overEntitlementReasons[0]?.code).toBe("cash-management.maxLocations");
  });

  it("supersedes an active trial when a paid subscription becomes active", async () => {
    const repo = new InMemoryBillingRepo();
    const service = createService(repo);

    await service.startTrial("tenant-1", "user-1", {
      productKey: CashManagementProductKey,
    });

    const subscription = await service.setPlanForTenant(
      "tenant-1",
      CashManagementProductKey,
      "starter-monthly",
      {
        provider: "stripe",
        customerRef: "cus_123",
        subscriptionRef: "sub_123",
        status: "active",
      }
    );
    const trial = await service.getTrial("tenant-1", CashManagementProductKey);

    expect(subscription.entitlementSource).toBe("paid_subscription");
    expect(subscription.planCode).toBe("starter-monthly");
    expect(trial.status).toBe("superseded_by_subscription");
    expect(trial.supersededAt).not.toBeNull();
  });
});
