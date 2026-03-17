import { Inject, Injectable } from "@nestjs/common";
import type {
  BillingEntitlements,
  BillingOverEntitlementReason,
  BillingPlanCode,
  BillingProductKey,
  BillingSubscription,
  BillingTrial,
  BillingUpgradeContext,
  BillingUsageMetric,
  CreateBillingCheckoutSessionInput,
  CreateBillingCheckoutSessionOutput,
  CreateBillingPortalSessionInput,
  CreateBillingPortalSessionOutput,
  StartBillingTrialInput,
  StartBillingTrialOutput,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  ValidationError,
  type AuditPort,
  type OutboxPort,
  type TransactionContext,
  type UnitOfWorkPort,
} from "@corely/kernel";
import { type BillingAccessPort, type BillingUsageMetricCode } from "./ports/billing-access.port";
import { BILLING_PROVIDER_PORT, type BillingProviderPort } from "./ports/billing-provider.port";
import {
  BILLING_ACCOUNT_REPO,
  BILLING_PROVIDER_EVENT_REPO,
  BILLING_SUBSCRIPTION_REPO,
  BILLING_TRIAL_REPO,
  BILLING_USAGE_REPO,
  type BillingAccountRecord,
  type BillingAccountRepoPort,
  type BillingProviderEventRepoPort,
  type BillingSubscriptionRecord,
  type BillingSubscriptionRepoPort,
  type BillingTrialRecord,
  type BillingTrialRepoPort,
  type BillingUsageRepoPort,
} from "./ports/billing-repository.port";
import {
  defaultBillingProductKey,
  getBillingPlanDefinition,
  getBillingProductDefinition,
  getBillingUsageMetricDefinitions,
  listBillingPlans,
  listBillingProducts,
  resolveBillingEntitlements,
} from "../domain/billing-plans";

const dbStatusToContract = {
  FREE: "free",
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELED: "canceled",
  INCOMPLETE: "incomplete",
  UNPAID: "unpaid",
} as const;

const contractStatusToDb = {
  free: "FREE",
  trialing: "TRIALING",
  active: "ACTIVE",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  unpaid: "UNPAID",
} as const;

type EffectiveBillingState = {
  account: BillingAccountRecord;
  productKey: BillingProductKey;
  subscriptionRecord: BillingSubscriptionRecord | null;
  trialRecord: BillingTrialRecord | null;
  effectivePlanCode: BillingPlanCode;
  entitlementSource: BillingSubscription["entitlementSource"];
};

const toIso = (value: Date | null | undefined): string | null => value?.toISOString() ?? null;

const startOfUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

const startOfNextUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));

const addDaysUtc = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const addMonthsUtc = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

const startOfCurrentUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const hasPaidSubscription = (subscription: BillingSubscriptionRecord | null): boolean =>
  subscription !== null && subscription.planCode !== "free" && subscription.status !== "free";

const resolveUpgradePlanCode = (
  productKey: BillingProductKey,
  effectivePlanCode: BillingPlanCode,
  isOverEntitlement: boolean,
  trial: BillingTrial
): BillingPlanCode | null => {
  const product = getBillingProductDefinition(productKey);
  if (isOverEntitlement && product.trial) {
    return product.trial.planCode;
  }

  if (trial.status === "expired" && product.trial) {
    return product.trial.planCode;
  }

  const orderedPlans = listBillingPlans(productKey);
  const currentRank =
    orderedPlans.find((plan) => plan.code === effectivePlanCode)?.upgradeRank ?? 0;
  return orderedPlans.find((plan) => plan.upgradeRank > currentRank)?.code ?? null;
};

@Injectable()
export class BillingAccessService implements BillingAccessPort {
  constructor(
    @Inject(BILLING_ACCOUNT_REPO)
    private readonly accountRepo: BillingAccountRepoPort,
    @Inject(BILLING_SUBSCRIPTION_REPO)
    private readonly subscriptionRepo: BillingSubscriptionRepoPort,
    @Inject(BILLING_TRIAL_REPO)
    private readonly trialRepo: BillingTrialRepoPort,
    @Inject(BILLING_USAGE_REPO)
    private readonly usageRepo: BillingUsageRepoPort,
    @Inject(BILLING_PROVIDER_EVENT_REPO)
    private readonly providerEventRepo: BillingProviderEventRepoPort,
    @Inject(BILLING_PROVIDER_PORT)
    private readonly provider: BillingProviderPort,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT)
    private readonly outbox: OutboxPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort
  ) {}

  async getSubscription(
    tenantId: string,
    productKey: BillingProductKey = defaultBillingProductKey
  ): Promise<BillingSubscription> {
    const state = await this.loadEffectiveState(tenantId, productKey);
    return this.toSubscriptionDto(state);
  }

  async getEntitlements(
    tenantId: string,
    productKey: BillingProductKey = defaultBillingProductKey
  ): Promise<BillingEntitlements> {
    const subscription = await this.getSubscription(tenantId, productKey);
    return resolveBillingEntitlements(subscription.productKey, subscription.planCode);
  }

  async getPlanFeatureValues(
    tenantId: string,
    productKey: BillingProductKey = defaultBillingProductKey
  ): Promise<Record<string, unknown>> {
    const entitlements = await this.getEntitlements(tenantId, productKey);
    return entitlements.featureValues;
  }

  async getAllPlanFeatureValues(tenantId: string): Promise<Record<string, unknown>> {
    const entries = await Promise.all(
      listBillingProducts().map(
        async (product) =>
          [
            product.productKey,
            await this.getPlanFeatureValues(tenantId, product.productKey),
          ] as const
      )
    );

    return entries.reduce<Record<string, unknown>>(
      (acc, [, featureValues]) => ({ ...acc, ...featureValues }),
      {}
    );
  }

  async getTrial(
    tenantId: string,
    productKey: BillingProductKey = defaultBillingProductKey
  ): Promise<BillingTrial> {
    const resolvedProductKey = this.resolveProductKey(productKey);
    const state = await this.loadEffectiveState(tenantId, resolvedProductKey);
    return this.toTrialDto(state.trialRecord, resolvedProductKey);
  }

  async getUpgradeContext(
    tenantId: string,
    productKey: BillingProductKey = defaultBillingProductKey
  ): Promise<BillingUpgradeContext> {
    const resolvedProductKey = this.resolveProductKey(productKey);
    const [state, trial, profile] = await Promise.all([
      this.loadEffectiveState(tenantId, resolvedProductKey),
      this.getTrial(tenantId, resolvedProductKey),
      this.accountRepo.getTenantProfile(tenantId),
    ]);

    const entitlements = resolveBillingEntitlements(resolvedProductKey, state.effectivePlanCode);
    const maxLocations = this.resolveNumericFeature(
      entitlements,
      `${resolvedProductKey}.maxLocations`
    );

    const overEntitlementReasons: BillingOverEntitlementReason[] = [];
    if (typeof maxLocations === "number" && profile.workspaceCount > maxLocations) {
      overEntitlementReasons.push({
        code: `${resolvedProductKey}.maxLocations`,
        message: `This workspace currently uses ${profile.workspaceCount} locations, but the ${state.effectivePlanCode} plan allows ${maxLocations}.`,
        actual: profile.workspaceCount,
        limit: maxLocations,
      });
    }

    const recommendedPlanCode = resolveUpgradePlanCode(
      resolvedProductKey,
      state.effectivePlanCode,
      overEntitlementReasons.length > 0,
      trial
    );

    return {
      productKey: resolvedProductKey,
      effectivePlanCode: state.effectivePlanCode,
      entitlementSource: state.entitlementSource,
      recommendedPlanCode,
      requiresUpgrade:
        trial.status === "expired" ||
        overEntitlementReasons.length > 0 ||
        state.effectivePlanCode === getBillingProductDefinition(resolvedProductKey).defaultPlanCode,
      isOverEntitlement: overEntitlementReasons.length > 0,
      overEntitlementReasons,
      trial,
    };
  }

  async getUsage(
    tenantId: string,
    productKey: BillingProductKey = defaultBillingProductKey
  ): Promise<BillingUsageMetric[]> {
    const resolvedProductKey = this.resolveProductKey(productKey);
    const [subscription, entitlements, counters] = await Promise.all([
      this.getSubscription(tenantId, resolvedProductKey),
      this.getEntitlements(tenantId, resolvedProductKey),
      this.usageRepo.listUsage(tenantId, resolvedProductKey),
    ]);

    const { periodStart, periodEnd } = this.resolvePeriod(subscription);
    const currentCounters = new Map(
      counters
        .filter(
          (counter) =>
            counter.periodStart.getTime() === periodStart.getTime() &&
            counter.periodEnd.getTime() === periodEnd.getTime()
        )
        .map((counter) => [counter.metricKey, counter.quantity] as const)
    );

    return getBillingUsageMetricDefinitions(resolvedProductKey).map((metric) =>
      this.toUsageMetric(
        resolvedProductKey,
        metric.key,
        metric.label,
        currentCounters.get(metric.key) ?? 0,
        this.resolveNumericFeature(entitlements, metric.limitFeatureKey),
        periodStart,
        periodEnd
      )
    );
  }

  async startTrial(
    tenantId: string,
    userId: string | null,
    input: StartBillingTrialInput
  ): Promise<StartBillingTrialOutput> {
    const productKey = this.resolveProductKey(input.productKey);
    const trialDefinition = getBillingProductDefinition(productKey).trial;
    if (!trialDefinition) {
      throw new ValidationError(
        `Trials are not available for product ${productKey}`,
        { productKey },
        "Billing:TrialUnavailable"
      );
    }

    await this.unitOfWork.withinTransaction(async (tx) => {
      const account = await this.ensureLocalAccount(tenantId, tx);
      await this.normalizeBillingState(tenantId, productKey, account, tx);

      const [existingTrial, subscription] = await Promise.all([
        this.trialRepo.findTrialByTenantId(tenantId, productKey, tx),
        this.subscriptionRepo.findSubscriptionByTenantId(tenantId, productKey, tx),
      ]);

      if (existingTrial?.status === "active" && existingTrial.endsAt.getTime() > Date.now()) {
        return;
      }

      if (existingTrial && existingTrial.status !== "active") {
        throw new ValidationError(
          "This workspace has already used its trial for this product",
          { tenantId, productKey },
          "Billing:TrialAlreadyUsed"
        );
      }

      if (hasPaidSubscription(subscription)) {
        throw new ValidationError(
          "A paid subscription already exists for this workspace",
          { tenantId, productKey },
          "Billing:TrialAlreadySubscribed"
        );
      }

      const startedAt = new Date();
      const endsAt = addDaysUtc(startedAt, trialDefinition.durationDays);
      await this.trialRepo.upsertTrial(
        {
          tenantId,
          productKey,
          accountId: account.id,
          planCode: trialDefinition.planCode,
          status: "active",
          startedAt,
          endsAt,
          activatedByUserId: userId,
          source: input.source ?? "self-serve",
        },
        tx
      );

      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "billing.trial.started",
          payload: {
            tenantId,
            productKey,
            planCode: trialDefinition.planCode,
            startedAt: startedAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "billing.entitlements.changed",
          payload: {
            tenantId,
            productKey,
            entitlementSource: "trial",
            planCode: trialDefinition.planCode,
          },
        },
        tx
      );
      await this.audit.log(
        {
          tenantId,
          userId: userId ?? "system",
          action: "billing.trial.started",
          entityType: "BillingTrial",
          entityId: `${tenantId}:${productKey}`,
          metadata: {
            productKey,
            planCode: trialDefinition.planCode,
            durationDays: trialDefinition.durationDays,
            source: input.source ?? "self-serve",
          },
        },
        tx
      );
    });

    const [subscription, entitlements, trial, upgradeContext] = await Promise.all([
      this.getSubscription(tenantId, productKey),
      this.getEntitlements(tenantId, productKey),
      this.getTrial(tenantId, productKey),
      this.getUpgradeContext(tenantId, productKey),
    ]);

    return {
      subscription,
      entitlements,
      trial,
      upgradeContext,
      plan: getBillingPlanDefinition(subscription.productKey, subscription.planCode),
    };
  }

  async createCheckoutSession(
    tenantId: string,
    input: CreateBillingCheckoutSessionInput
  ): Promise<CreateBillingCheckoutSessionOutput> {
    const productKey = this.resolveProductKey(input.productKey);
    this.assertPlanExists(productKey, input.planCode);

    const account = await this.ensureLocalAccount(tenantId);
    const profile = await this.accountRepo.getTenantProfile(tenantId);
    const customer = await this.provider.ensureCustomer({
      tenantId,
      accountId: account.id,
      tenantName: profile.name,
      email: account.email ?? profile.primaryEmail,
      existingCustomerRef: account.providerCustomerRef,
    });

    if (customer.customerRef !== account.providerCustomerRef) {
      await this.accountRepo.upsertAccount({
        tenantId,
        provider: "stripe",
        providerCustomerRef: customer.customerRef,
        billingCurrency: account.billingCurrency,
        email: account.email ?? profile.primaryEmail,
      });
    }

    const session = await this.provider.createCheckoutSession({
      tenantId,
      customerRef: customer.customerRef,
      productKey,
      planCode: input.planCode,
      successUrl: input.successPath ?? "/billing?checkout=success",
      cancelUrl: input.cancelPath ?? "/billing?checkout=cancelled",
    });

    await this.audit.log({
      tenantId,
      userId: "system",
      action: "billing.checkout.created",
      entityType: "BillingAccount",
      entityId: account.id,
      metadata: {
        productKey,
        planCode: input.planCode,
        provider: "stripe",
        sessionId: session.sessionId,
      },
    });

    return session;
  }

  async createPortalSession(
    tenantId: string,
    input: CreateBillingPortalSessionInput
  ): Promise<CreateBillingPortalSessionOutput> {
    const account = await this.ensureLocalAccount(tenantId);
    if (!account.providerCustomerRef) {
      throw new ValidationError(
        "Billing portal is only available after a paid checkout has created a customer record",
        undefined,
        "Billing:PortalUnavailable"
      );
    }

    return this.provider.createPortalSession({
      customerRef: account.providerCustomerRef,
      returnUrl: input.returnPath ?? "/billing",
    });
  }

  async syncSubscription(
    tenantId: string,
    productKey: BillingProductKey = defaultBillingProductKey
  ): Promise<BillingSubscription> {
    const resolvedProductKey = this.resolveProductKey(productKey);
    const account = await this.ensureLocalAccount(tenantId);
    const current = await this.subscriptionRepo.findSubscriptionByTenantId(
      tenantId,
      resolvedProductKey
    );
    const snapshot = await this.provider.fetchSubscriptionSnapshot({
      productKey: resolvedProductKey,
      subscriptionRef: current?.providerSubscriptionRef,
      customerRef: account.providerCustomerRef,
    });

    if (!snapshot) {
      const state = await this.loadEffectiveState(tenantId, resolvedProductKey);
      return this.toSubscriptionDto(state);
    }

    return this.setPlanForTenant(tenantId, snapshot.productKey, snapshot.planCode, {
      provider: snapshot.provider,
      customerRef: snapshot.customerRef,
      subscriptionRef: snapshot.subscriptionRef,
      priceRef: snapshot.priceRef,
      status: snapshot.status,
      currentPeriodStart: snapshot.currentPeriodStart,
      currentPeriodEnd: snapshot.currentPeriodEnd,
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      canceledAt: snapshot.canceledAt,
      trialEndsAt: snapshot.trialEndsAt,
      rawSnapshot: snapshot.rawSnapshot,
    });
  }

  async recordUsage(
    tenantId: string,
    productKey: BillingProductKey,
    metric: BillingUsageMetricCode,
    quantity: number,
    tx?: TransactionContext
  ): Promise<void> {
    if (quantity <= 0) {
      return;
    }

    const subscription = await this.getSubscription(tenantId, productKey);
    const { periodStart, periodEnd } = this.resolvePeriod(subscription);

    await this.usageRepo.incrementUsage(
      {
        tenantId,
        productKey: subscription.productKey,
        metricKey: metric,
        periodStart,
        periodEnd,
        quantity,
      },
      tx
    );
  }

  async setPlanForTenant(
    tenantId: string,
    productKey: BillingProductKey,
    planCode: BillingPlanCode,
    metadata?: {
      provider?: "stripe";
      customerRef?: string | null;
      subscriptionRef?: string | null;
      priceRef?: string | null;
      status?: BillingSubscription["status"];
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      cancelAtPeriodEnd?: boolean;
      canceledAt?: Date | null;
      trialEndsAt?: Date | null;
      rawSnapshot?: unknown;
    },
    tx?: TransactionContext
  ): Promise<BillingSubscription> {
    const resolvedProductKey = this.resolveProductKey(productKey);
    this.assertPlanExists(resolvedProductKey, planCode);

    const account = await this.accountRepo.upsertAccount(
      {
        tenantId,
        provider: metadata?.provider ?? null,
        providerCustomerRef: metadata?.customerRef ?? undefined,
      },
      tx
    );

    const record = await this.subscriptionRepo.upsertSubscription(
      {
        tenantId,
        productKey: resolvedProductKey,
        accountId: account.id,
        planCode,
        provider: metadata?.provider ?? null,
        providerSubscriptionRef: metadata?.subscriptionRef ?? null,
        providerPriceRef: metadata?.priceRef ?? null,
        status: metadata?.status ?? (planCode === "free" ? "free" : "active"),
        currentPeriodStart:
          metadata?.currentPeriodStart ??
          (planCode === "free" ? startOfUtcMonth(new Date()) : null),
        currentPeriodEnd:
          metadata?.currentPeriodEnd ??
          (planCode === "free" ? startOfNextUtcMonth(new Date()) : null),
        cancelAtPeriodEnd: metadata?.cancelAtPeriodEnd ?? false,
        canceledAt: metadata?.canceledAt ?? null,
        trialEndsAt: metadata?.trialEndsAt ?? null,
        rawSnapshotJson: metadata?.rawSnapshot ?? null,
        lastSyncedAt: new Date(),
      },
      tx
    );

    if (hasPaidSubscription(record)) {
      await this.supersedeActiveTrialIfNeeded(tenantId, resolvedProductKey, account, tx);
    }

    await this.outbox.enqueue(
      {
        tenantId,
        eventType: "billing.subscription.updated",
        payload: {
          tenantId,
          productKey: record.productKey,
          planCode: record.planCode,
          status: record.status,
        },
      },
      tx
    );
    await this.outbox.enqueue(
      {
        tenantId,
        eventType: "billing.entitlements.changed",
        payload: {
          tenantId,
          productKey: record.productKey,
          entitlementSource: hasPaidSubscription(record) ? "paid_subscription" : "free",
          planCode: record.planCode,
        },
      },
      tx
    );

    const state = await this.loadEffectiveState(tenantId, resolvedProductKey, tx, account);
    return this.toSubscriptionDto(state);
  }

  async processVerifiedWebhookEvent(input: {
    provider: "stripe";
    eventId: string;
    eventType: string;
    tenantId: string;
    customerRef: string | null;
    subscriptionRef: string | null;
    productKey?: BillingProductKey | null;
    rawPayload: unknown;
  }): Promise<void> {
    const existing = await this.providerEventRepo.findByExternalEventId(
      input.provider,
      input.eventId
    );
    if (existing) {
      return;
    }

    await this.unitOfWork.withinTransaction(async (tx) => {
      const account = await this.accountRepo.upsertAccount(
        {
          tenantId: input.tenantId,
          provider: input.provider,
          providerCustomerRef: input.customerRef ?? undefined,
        },
        tx
      );

      const event = await this.providerEventRepo.createEvent(
        {
          tenantId: input.tenantId,
          accountId: account.id,
          provider: input.provider,
          externalEventId: input.eventId,
          eventType: input.eventType,
          payloadJson: input.rawPayload,
        },
        tx
      );

      try {
        const snapshot = await this.provider.fetchSubscriptionSnapshot({
          productKey: input.productKey ?? undefined,
          subscriptionRef: input.subscriptionRef,
          customerRef: input.customerRef,
        });

        if (!snapshot) {
          await this.providerEventRepo.markIgnored(event.id, tx);
          return;
        }

        await this.setPlanForTenant(
          input.tenantId,
          snapshot.productKey,
          snapshot.planCode,
          {
            provider: snapshot.provider,
            customerRef: snapshot.customerRef,
            subscriptionRef: snapshot.subscriptionRef,
            priceRef: snapshot.priceRef,
            status: snapshot.status,
            currentPeriodStart: snapshot.currentPeriodStart,
            currentPeriodEnd: snapshot.currentPeriodEnd,
            cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
            canceledAt: snapshot.canceledAt,
            trialEndsAt: snapshot.trialEndsAt,
            rawSnapshot: snapshot.rawSnapshot,
          },
          tx
        );

        await this.providerEventRepo.markProcessed(event.id, tx);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown billing webhook error";
        await this.providerEventRepo.markFailed(event.id, message, tx);
        throw error;
      }
    });
  }

  async expireDueTrials(limit = 200): Promise<number> {
    const dueTrials = await this.trialRepo.listTrialsEndingBefore(new Date());
    let expiredCount = 0;

    for (const trial of dueTrials.slice(0, Math.max(1, limit))) {
      await this.unitOfWork.withinTransaction(async (tx) => {
        const account = await this.ensureLocalAccount(trial.tenantId, tx);
        const expired = await this.expireTrialIfNeeded(
          trial.tenantId,
          trial.productKey,
          account,
          tx,
          trial
        );
        if (expired) {
          expiredCount += 1;
        }
      });
    }

    return expiredCount;
  }

  private resolveProductKey(productKey?: BillingProductKey | null): BillingProductKey {
    return productKey ?? defaultBillingProductKey;
  }

  private assertPlanExists(productKey: BillingProductKey, planCode: BillingPlanCode): void {
    try {
      getBillingPlanDefinition(productKey, planCode);
    } catch {
      throw new ValidationError(
        `Unknown billing plan ${planCode} for product ${productKey}`,
        { productKey, planCode },
        "Billing:UnknownPlan"
      );
    }
  }

  private async ensureLocalAccount(
    tenantId: string,
    tx?: TransactionContext
  ): Promise<BillingAccountRecord> {
    const existing = await this.accountRepo.findAccountByTenantId(tenantId, tx);
    if (existing) {
      return existing;
    }

    const profile = await this.accountRepo.getTenantProfile(tenantId);
    return this.accountRepo.upsertAccount(
      {
        tenantId,
        provider: null,
        email: profile.primaryEmail,
      },
      tx
    );
  }

  private async loadEffectiveState(
    tenantId: string,
    productKey: BillingProductKey,
    tx?: TransactionContext,
    accountOverride?: BillingAccountRecord
  ): Promise<EffectiveBillingState> {
    const resolvedProductKey = this.resolveProductKey(productKey);
    const account = accountOverride ?? (await this.ensureLocalAccount(tenantId, tx));
    await this.normalizeBillingState(tenantId, resolvedProductKey, account, tx);

    const [subscriptionRecord, trialRecord] = await Promise.all([
      this.subscriptionRepo.findSubscriptionByTenantId(tenantId, resolvedProductKey, tx),
      this.trialRepo.findTrialByTenantId(tenantId, resolvedProductKey, tx),
    ]);

    if (hasPaidSubscription(subscriptionRecord)) {
      return {
        account,
        productKey: resolvedProductKey,
        subscriptionRecord,
        trialRecord,
        effectivePlanCode: subscriptionRecord.planCode,
        entitlementSource: "paid_subscription",
      };
    }

    if (trialRecord?.status === "active") {
      return {
        account,
        productKey: resolvedProductKey,
        subscriptionRecord,
        trialRecord,
        effectivePlanCode: trialRecord.planCode,
        entitlementSource: "trial",
      };
    }

    return {
      account,
      productKey: resolvedProductKey,
      subscriptionRecord,
      trialRecord,
      effectivePlanCode:
        subscriptionRecord?.planCode === "free"
          ? "free"
          : getBillingProductDefinition(resolvedProductKey).defaultPlanCode,
      entitlementSource: "free",
    };
  }

  private async normalizeBillingState(
    tenantId: string,
    productKey: BillingProductKey,
    account: BillingAccountRecord,
    tx?: TransactionContext
  ): Promise<void> {
    const [subscription, trial] = await Promise.all([
      this.subscriptionRepo.findSubscriptionByTenantId(tenantId, productKey, tx),
      this.trialRepo.findTrialByTenantId(tenantId, productKey, tx),
    ]);

    if (trial?.status === "active" && hasPaidSubscription(subscription)) {
      await this.supersedeTrial(tenantId, productKey, account, trial, tx);
      return;
    }

    if (trial?.status === "active") {
      await this.expireTrialIfNeeded(tenantId, productKey, account, tx, trial);
    }

    if (subscription?.planCode === "free" && subscription.currentPeriodEnd) {
      await this.advanceFreePeriodIfNeeded(tenantId, productKey, account, subscription, tx);
    }
  }

  private async supersedeActiveTrialIfNeeded(
    tenantId: string,
    productKey: BillingProductKey,
    account: BillingAccountRecord,
    tx?: TransactionContext
  ): Promise<void> {
    const trial = await this.trialRepo.findTrialByTenantId(tenantId, productKey, tx);
    if (trial?.status !== "active") {
      return;
    }

    await this.supersedeTrial(tenantId, productKey, account, trial, tx);
  }

  private async supersedeTrial(
    tenantId: string,
    productKey: BillingProductKey,
    account: BillingAccountRecord,
    trial: BillingTrialRecord,
    tx?: TransactionContext
  ): Promise<void> {
    const supersededAt = new Date();
    await this.trialRepo.upsertTrial(
      {
        tenantId,
        productKey,
        accountId: account.id,
        planCode: trial.planCode,
        status: "superseded_by_subscription",
        startedAt: trial.startedAt,
        endsAt: trial.endsAt,
        expiredAt: trial.expiredAt,
        supersededAt,
        activatedByUserId: trial.activatedByUserId,
        source: trial.source,
      },
      tx
    );

    await this.outbox.enqueue(
      {
        tenantId,
        eventType: "billing.trial.superseded",
        payload: {
          tenantId,
          productKey,
          planCode: trial.planCode,
          supersededAt: supersededAt.toISOString(),
        },
      },
      tx
    );
    await this.audit.log(
      {
        tenantId,
        userId: "system",
        action: "billing.trial.superseded",
        entityType: "BillingTrial",
        entityId: trial.id,
        metadata: {
          productKey,
          planCode: trial.planCode,
          supersededAt: supersededAt.toISOString(),
        },
      },
      tx
    );
  }

  private async expireTrialIfNeeded(
    tenantId: string,
    productKey: BillingProductKey,
    account: BillingAccountRecord,
    tx?: TransactionContext,
    trialOverride?: BillingTrialRecord
  ): Promise<boolean> {
    const trial =
      trialOverride ?? (await this.trialRepo.findTrialByTenantId(tenantId, productKey, tx));
    if (!trial || trial.status !== "active" || trial.endsAt.getTime() > Date.now()) {
      return false;
    }

    const expiredAt = new Date();
    await this.trialRepo.upsertTrial(
      {
        tenantId,
        productKey,
        accountId: account.id,
        planCode: trial.planCode,
        status: "expired",
        startedAt: trial.startedAt,
        endsAt: trial.endsAt,
        expiredAt,
        supersededAt: trial.supersededAt,
        activatedByUserId: trial.activatedByUserId,
        source: trial.source,
      },
      tx
    );
    await this.setFreePlanWindowFrom(tenantId, productKey, account, expiredAt, tx);

    await this.outbox.enqueue(
      {
        tenantId,
        eventType: "billing.trial.expired",
        payload: {
          tenantId,
          productKey,
          planCode: trial.planCode,
          expiredAt: expiredAt.toISOString(),
        },
      },
      tx
    );
    await this.outbox.enqueue(
      {
        tenantId,
        eventType: "billing.entitlements.changed",
        payload: {
          tenantId,
          productKey,
          entitlementSource: "free",
          planCode: "free",
        },
      },
      tx
    );
    await this.audit.log(
      {
        tenantId,
        userId: "system",
        action: "billing.trial.expired",
        entityType: "BillingTrial",
        entityId: trial.id,
        metadata: {
          productKey,
          expiredAt: expiredAt.toISOString(),
        },
      },
      tx
    );

    return true;
  }

  private async setFreePlanWindowFrom(
    tenantId: string,
    productKey: BillingProductKey,
    account: BillingAccountRecord,
    anchor: Date,
    tx?: TransactionContext
  ): Promise<void> {
    await this.subscriptionRepo.upsertSubscription(
      {
        tenantId,
        productKey,
        accountId: account.id,
        planCode: "free",
        provider: null,
        providerSubscriptionRef: null,
        providerPriceRef: null,
        status: "free",
        currentPeriodStart: anchor,
        currentPeriodEnd: addMonthsUtc(anchor, 1),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEndsAt: null,
        rawSnapshotJson: null,
        lastSyncedAt: new Date(),
      },
      tx
    );
  }

  private async advanceFreePeriodIfNeeded(
    tenantId: string,
    productKey: BillingProductKey,
    account: BillingAccountRecord,
    subscription: BillingSubscriptionRecord,
    tx?: TransactionContext
  ): Promise<void> {
    if (
      subscription.planCode !== "free" ||
      !subscription.currentPeriodStart ||
      !subscription.currentPeriodEnd
    ) {
      return;
    }

    const now = new Date();
    if (subscription.currentPeriodEnd.getTime() > now.getTime()) {
      return;
    }

    let periodStart = subscription.currentPeriodStart;
    let periodEnd = subscription.currentPeriodEnd;
    while (periodEnd.getTime() <= now.getTime()) {
      periodStart = periodEnd;
      periodEnd = addMonthsUtc(periodEnd, 1);
    }

    await this.subscriptionRepo.upsertSubscription(
      {
        tenantId,
        productKey,
        accountId: account.id,
        planCode: "free",
        provider: subscription.provider,
        providerSubscriptionRef: subscription.providerSubscriptionRef,
        providerPriceRef: subscription.providerPriceRef,
        status: "free",
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEndsAt: null,
        rawSnapshotJson: subscription.rawSnapshotJson,
        lastSyncedAt: new Date(),
      },
      tx
    );
  }

  private resolvePeriod(subscription: BillingSubscription): { periodStart: Date; periodEnd: Date } {
    if (subscription.currentPeriodStart && subscription.currentPeriodEnd) {
      return {
        periodStart: new Date(subscription.currentPeriodStart),
        periodEnd: new Date(subscription.currentPeriodEnd),
      };
    }

    const now = new Date();
    return {
      periodStart: startOfUtcMonth(now),
      periodEnd: startOfNextUtcMonth(now),
    };
  }

  private resolveNumericFeature(
    entitlements: BillingEntitlements,
    featureKey: string | null
  ): number | null {
    if (!featureKey) {
      return null;
    }

    const value = entitlements.featureValues[featureKey];
    return typeof value === "number" ? value : null;
  }

  private toSubscriptionDto(state: EffectiveBillingState): BillingSubscription {
    if (state.entitlementSource === "trial" && state.trialRecord) {
      return {
        accountId: state.account.id,
        productKey: state.trialRecord.productKey,
        planCode: state.trialRecord.planCode,
        entitlementSource: "trial",
        provider: null,
        status: "trialing",
        customerRef: state.account.providerCustomerRef,
        currentPeriodStart: toIso(state.trialRecord.startedAt),
        currentPeriodEnd: toIso(state.trialRecord.endsAt),
        cancelAtPeriodEnd: false,
        canceledAt: null,
        trialEndsAt: toIso(state.trialRecord.endsAt),
        lastSyncedAt: toIso(state.trialRecord.updatedAt),
      };
    }

    const record = state.subscriptionRecord;
    return {
      accountId: state.account.id,
      productKey: record?.productKey ?? state.trialRecord?.productKey ?? state.productKey,
      planCode: state.effectivePlanCode,
      entitlementSource: state.entitlementSource,
      provider: record?.provider ?? state.account.provider ?? null,
      status: record?.status ?? "free",
      customerRef: state.account.providerCustomerRef,
      currentPeriodStart: toIso(record?.currentPeriodStart),
      currentPeriodEnd: toIso(record?.currentPeriodEnd),
      cancelAtPeriodEnd: record?.cancelAtPeriodEnd ?? false,
      canceledAt: toIso(record?.canceledAt),
      trialEndsAt: toIso(record?.trialEndsAt),
      lastSyncedAt: toIso(record?.lastSyncedAt),
    };
  }

  private toTrialDto(
    record: BillingTrialRecord | null,
    productKey: BillingProductKey
  ): BillingTrial {
    if (!record) {
      return {
        productKey,
        status: "not_started",
        startedAt: null,
        endsAt: null,
        expiredAt: null,
        supersededAt: null,
        activatedByUserId: null,
        source: null,
        daysRemaining: 0,
        isExpiringSoon: false,
      };
    }

    const now = startOfCurrentUtcDay(new Date());
    const trialEnd = startOfCurrentUtcDay(record.endsAt);
    const daysRemaining =
      record.status === "active"
        ? Math.max(Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)), 0)
        : 0;

    return {
      productKey: record.productKey,
      status: record.status,
      startedAt: toIso(record.startedAt),
      endsAt: toIso(record.endsAt),
      expiredAt: toIso(record.expiredAt),
      supersededAt: toIso(record.supersededAt),
      activatedByUserId: record.activatedByUserId,
      source: record.source,
      daysRemaining,
      isExpiringSoon: record.status === "active" && daysRemaining <= 7,
    };
  }

  private toUsageMetric(
    productKey: BillingProductKey,
    key: string,
    label: string,
    used: number,
    limit: number | null,
    periodStart: Date,
    periodEnd: Date
  ): BillingUsageMetric {
    const remaining = typeof limit === "number" ? Math.max(limit - used, 0) : null;
    const percentUsed = typeof limit === "number" && limit > 0 ? Math.min(used / limit, 1) : null;

    return {
      productKey,
      key,
      label,
      used,
      limit,
      remaining,
      percentUsed,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }
}

export const billingDbStatusFor = (
  status: BillingSubscription["status"]
): "FREE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "UNPAID" =>
  contractStatusToDb[status];

export const billingContractStatusFor = (
  status: "FREE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "UNPAID"
): BillingSubscription["status"] => dbStatusToContract[status];
