import { z } from "zod";

export const BillingProviderKindSchema = z.enum(["stripe"]);
export type BillingProviderKind = z.infer<typeof BillingProviderKindSchema>;

export const BillingProductKeySchema = z.string().min(1);
export type BillingProductKey = z.infer<typeof BillingProductKeySchema>;

export const BillingPlanCodeSchema = z.string().min(1);
export type BillingPlanCode = z.infer<typeof BillingPlanCodeSchema>;

export const BillingSubscriptionStatusSchema = z.enum([
  "free",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
  "unpaid",
]);
export type BillingSubscriptionStatus = z.infer<typeof BillingSubscriptionStatusSchema>;

export const BillingEntitlementSourceSchema = z.enum(["paid_subscription", "trial", "free"]);
export type BillingEntitlementSource = z.infer<typeof BillingEntitlementSourceSchema>;

export const BillingTrialStatusSchema = z.enum([
  "not_started",
  "active",
  "expired",
  "superseded_by_subscription",
]);
export type BillingTrialStatus = z.infer<typeof BillingTrialStatusSchema>;

export const BillingUsageMetricKeySchema = z.string().min(1);
export type BillingUsageMetricKey = z.infer<typeof BillingUsageMetricKeySchema>;

export const BillingFeatureValueSchema = z.union([z.boolean(), z.number(), z.string(), z.null()]);
export type BillingFeatureValue = z.infer<typeof BillingFeatureValueSchema>;

export const BillingFeatureValuesSchema = z.record(z.string(), BillingFeatureValueSchema);
export type BillingFeatureValues = z.infer<typeof BillingFeatureValuesSchema>;

export const BillingEntitlementsSchema = z.object({
  productKey: BillingProductKeySchema,
  planCode: BillingPlanCodeSchema,
  featureValues: BillingFeatureValuesSchema,
});
export type BillingEntitlements = z.infer<typeof BillingEntitlementsSchema>;

export const BillingPlanDefinitionSchema = z.object({
  productKey: BillingProductKeySchema,
  code: BillingPlanCodeSchema,
  name: z.string(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  interval: z.enum(["month"]),
  summary: z.string(),
  highlights: z.array(z.string()),
  upgradeRank: z.number().int().nonnegative().default(0),
  entitlements: BillingEntitlementsSchema,
});
export type BillingPlanDefinition = z.infer<typeof BillingPlanDefinitionSchema>;

export const BillingSubscriptionSchema = z.object({
  accountId: z.string(),
  productKey: BillingProductKeySchema,
  planCode: BillingPlanCodeSchema,
  entitlementSource: BillingEntitlementSourceSchema,
  provider: BillingProviderKindSchema.nullable(),
  status: BillingSubscriptionStatusSchema,
  customerRef: z.string().nullable(),
  currentPeriodStart: z.string().nullable(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.string().nullable(),
  trialEndsAt: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
});
export type BillingSubscription = z.infer<typeof BillingSubscriptionSchema>;

export const BillingTrialSchema = z.object({
  productKey: BillingProductKeySchema,
  status: BillingTrialStatusSchema,
  startedAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  expiredAt: z.string().nullable(),
  supersededAt: z.string().nullable(),
  activatedByUserId: z.string().nullable(),
  source: z.string().nullable(),
  daysRemaining: z.number().int().nonnegative(),
  isExpiringSoon: z.boolean(),
});
export type BillingTrial = z.infer<typeof BillingTrialSchema>;

export const BillingOverEntitlementReasonSchema = z.object({
  code: z.string(),
  message: z.string(),
  actual: z.number().nullable().optional(),
  limit: z.number().nullable().optional(),
});
export type BillingOverEntitlementReason = z.infer<typeof BillingOverEntitlementReasonSchema>;

export const BillingUpgradeContextSchema = z.object({
  productKey: BillingProductKeySchema,
  effectivePlanCode: BillingPlanCodeSchema,
  entitlementSource: BillingEntitlementSourceSchema,
  recommendedPlanCode: BillingPlanCodeSchema.nullable(),
  requiresUpgrade: z.boolean(),
  isOverEntitlement: z.boolean(),
  overEntitlementReasons: z.array(BillingOverEntitlementReasonSchema),
  trial: BillingTrialSchema,
});
export type BillingUpgradeContext = z.infer<typeof BillingUpgradeContextSchema>;

export const BillingUsageMetricSchema = z.object({
  productKey: BillingProductKeySchema,
  key: BillingUsageMetricKeySchema,
  label: z.string(),
  used: z.number().int().nonnegative(),
  limit: z.number().int().positive().nullable(),
  remaining: z.number().int().nonnegative().nullable(),
  periodStart: z.string(),
  periodEnd: z.string(),
  percentUsed: z.number().min(0).nullable(),
});
export type BillingUsageMetric = z.infer<typeof BillingUsageMetricSchema>;

export const BillingOverviewSchema = z.object({
  productKey: BillingProductKeySchema,
  subscription: BillingSubscriptionSchema,
  entitlements: BillingEntitlementsSchema,
  trial: BillingTrialSchema,
  upgradeContext: BillingUpgradeContextSchema,
  usage: z.array(BillingUsageMetricSchema),
  plans: z.array(BillingPlanDefinitionSchema),
  management: z.object({
    canManageBilling: z.boolean(),
    canUpgrade: z.boolean(),
    canStartTrial: z.boolean(),
    recommendedPlanCode: BillingPlanCodeSchema.nullable(),
    requiresUpgradePrompt: z.boolean(),
  }),
});
export type BillingOverview = z.infer<typeof BillingOverviewSchema>;

export const GetBillingCurrentOutputSchema = z.object({
  subscription: BillingSubscriptionSchema,
  entitlements: BillingEntitlementsSchema,
  trial: BillingTrialSchema,
  upgradeContext: BillingUpgradeContextSchema,
  plan: BillingPlanDefinitionSchema,
});
export type GetBillingCurrentOutput = z.infer<typeof GetBillingCurrentOutputSchema>;

export const GetBillingUsageOutputSchema = z.object({
  usage: z.array(BillingUsageMetricSchema),
});
export type GetBillingUsageOutput = z.infer<typeof GetBillingUsageOutputSchema>;

export const GetBillingOverviewOutputSchema = z.object({
  billing: BillingOverviewSchema,
});
export type GetBillingOverviewOutput = z.infer<typeof GetBillingOverviewOutputSchema>;

export const GetBillingUpgradeContextOutputSchema = z.object({
  upgradeContext: BillingUpgradeContextSchema,
});
export type GetBillingUpgradeContextOutput = z.infer<typeof GetBillingUpgradeContextOutputSchema>;

export const CreateBillingCheckoutSessionInputSchema = z.object({
  productKey: BillingProductKeySchema.optional(),
  planCode: BillingPlanCodeSchema.refine((value) => value !== "free", {
    message: "Free plans do not require checkout",
  }),
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
});
export type CreateBillingCheckoutSessionInput = z.infer<
  typeof CreateBillingCheckoutSessionInputSchema
>;

export const CreateBillingCheckoutSessionOutputSchema = z.object({
  checkoutUrl: z.string().url(),
  sessionId: z.string(),
});
export type CreateBillingCheckoutSessionOutput = z.infer<
  typeof CreateBillingCheckoutSessionOutputSchema
>;

export const CreateBillingPortalSessionInputSchema = z.object({
  productKey: BillingProductKeySchema.optional(),
  returnPath: z.string().optional(),
});
export type CreateBillingPortalSessionInput = z.infer<typeof CreateBillingPortalSessionInputSchema>;

export const CreateBillingPortalSessionOutputSchema = z.object({
  portalUrl: z.string().url(),
});
export type CreateBillingPortalSessionOutput = z.infer<
  typeof CreateBillingPortalSessionOutputSchema
>;

export const StartBillingTrialInputSchema = z.object({
  productKey: BillingProductKeySchema.optional(),
  source: z.string().optional(),
});
export type StartBillingTrialInput = z.infer<typeof StartBillingTrialInputSchema>;

export const StartBillingTrialOutputSchema = z.object({
  subscription: BillingSubscriptionSchema,
  entitlements: BillingEntitlementsSchema,
  trial: BillingTrialSchema,
  upgradeContext: BillingUpgradeContextSchema,
  plan: BillingPlanDefinitionSchema,
});
export type StartBillingTrialOutput = z.infer<typeof StartBillingTrialOutputSchema>;

export const ResyncBillingSubscriptionInputSchema = z.object({
  tenantId: z.string().optional(),
  productKey: BillingProductKeySchema.optional(),
});
export type ResyncBillingSubscriptionInput = z.infer<typeof ResyncBillingSubscriptionInputSchema>;

export const ResyncBillingSubscriptionOutputSchema = z.object({
  subscription: BillingSubscriptionSchema,
});
export type ResyncBillingSubscriptionOutput = z.infer<typeof ResyncBillingSubscriptionOutputSchema>;

export const BillingWebhookAckSchema = z.object({
  received: z.boolean(),
});
export type BillingWebhookAck = z.infer<typeof BillingWebhookAckSchema>;
