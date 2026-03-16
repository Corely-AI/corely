import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Progress,
  Skeleton,
  cn,
} from "@corely/ui";
import type { BillingPlanCode, BillingProductKey } from "@corely/contracts";
import { CashManagementProductKey } from "@corely/contracts";
import { billingApi } from "@corely/web-shared/lib/billing-api";
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useBillingCopy } from "./billing-copy";
import { BillingPlanCatalog } from "./billing-plan-catalog";
import { BillingTrialAlerts } from "./billing-trial-alerts";
import {
  featureIconMap,
  featureOrder,
  featureValueToText,
  formatPeriod,
  formatPrice,
  isPaidPlan,
  planOrder,
} from "./billing-utils";

const billingProductKey: BillingProductKey = CashManagementProductKey;

export function BillingScreen() {
  const queryClient = useQueryClient();
  const copy = useBillingCopy();

  const overviewQuery = useQuery({
    queryKey: ["billing", "overview", billingProductKey],
    queryFn: () => billingApi.getOverview(billingProductKey),
  });

  const checkoutMutation = useMutation({
    mutationFn: (planCode: Exclude<BillingPlanCode, "free">) =>
      billingApi.createCheckoutSession({
        productKey: billingProductKey,
        planCode,
        successPath: "/billing?checkout=success",
        cancelPath: "/billing?checkout=cancelled",
      }),
    onSuccess: (result) => {
      window.location.assign(result.checkoutUrl);
    },
  });

  const portalMutation = useMutation({
    mutationFn: () =>
      billingApi.createPortalSession({
        productKey: billingProductKey,
        returnPath: "/billing",
      }),
    onSuccess: (result) => {
      window.location.assign(result.portalUrl);
    },
  });

  const startTrialMutation = useMutation({
    mutationFn: () =>
      billingApi.startTrial({
        productKey: billingProductKey,
        source: "billing-page",
      }),
    onSuccess: async () => {
      toast.success(copy.trialStarted);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing", "overview", billingProductKey] }),
        queryClient.invalidateQueries({ queryKey: ["billing", "current", billingProductKey] }),
      ]);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : copy.trialStartFailed);
    },
  });

  const billing = overviewQuery.data?.billing;

  const orderedPlans = useMemo(
    () =>
      [...(billing?.plans ?? [])].sort(
        (left, right) => planOrder.indexOf(left.code) - planOrder.indexOf(right.code)
      ),
    [billing?.plans]
  );

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-[32rem] max-w-full" />
        </div>
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (overviewQuery.isError || !billing) {
    return (
      <div className="space-y-6 p-6 md:p-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.subtitle}</p>
        </div>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{copy.loadFailed}</AlertTitle>
          <AlertDescription>
            {(overviewQuery.error as Error | undefined)?.message ?? copy.loadFailed}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const currentPlan = orderedPlans.find((plan) => plan.code === billing.subscription.planCode);
  const trial = billing.trial;
  const upgradeContext = billing.upgradeContext;
  const featureEntries = featureOrder.map((feature) => ({
    key: feature.key,
    labelKey: feature.labelKey,
    value: billing.entitlements.featureValues[feature.key],
  }));
  const featuredPlan =
    orderedPlans.find((plan) => plan.code === "pro-monthly") ??
    orderedPlans.find((plan) => plan.code !== "free");
  const isFreePlan = billing.subscription.planCode === "free";

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(235,207,160,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(130,160,196,0.16),transparent_28%)] p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-border/60 bg-card/95 p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {copy.currentPlan}
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">{copy.subtitle}</p>
            </div>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm">
                <div className="text-muted-foreground">{copy.period}</div>
                <div className="mt-1 font-medium">
                  {formatPeriod(
                    billing.subscription.currentPeriodStart,
                    billing.subscription.currentPeriodEnd
                  )}
                </div>
              </div>
              {billing.management.canManageBilling ? (
                <Button
                  variant="outline"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {copy.manageBilling}
                </Button>
              ) : null}
            </div>
          </div>
        </section>

        <BillingTrialAlerts trial={trial} copy={copy} />

        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <Card className="rounded-3xl border border-emerald-400/25 bg-gradient-to-r from-emerald-500/12 via-sky-500/8 to-transparent shadow-[0_20px_50px_-30px_rgba(0,0,0,0.8)]">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-emerald-500/20 text-emerald-100">
                  {featuredPlan?.name ?? "Upgrade"}
                </Badge>
                <Badge variant="secondary" className="rounded-full">
                  {copy.recommendedTitle}
                </Badge>
              </div>
              <CardTitle className="mt-3 text-3xl font-semibold">
                {isFreePlan
                  ? "Upgrade to unlock exports, AI, and unlimited receipts"
                  : "Stay ahead with full features"}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {featuredPlan?.summary ??
                  "Full cash-control with exports, AI assistance, and multi-location support."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-4 text-2xl font-semibold">
                {featuredPlan ? (
                  <>
                    {featuredPlan.priceCents === 0
                      ? "€0"
                      : `${formatPrice(featuredPlan.priceCents, featuredPlan.currency)} / mo`}
                    <span className="text-sm font-normal text-muted-foreground">
                      {copy.billedMonthly}
                    </span>
                  </>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {(featuredPlan?.highlights ?? []).slice(0, 5).map((highlight) => (
                  <div
                    key={highlight}
                    className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/8 px-3 py-2 text-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                {billing.management.canStartTrial ? (
                  <Button
                    size="lg"
                    className="min-w-[180px] shadow-[0_20px_60px_-35px_rgba(16,185,129,0.8)]"
                    onClick={() => startTrialMutation.mutate()}
                    disabled={startTrialMutation.isPending}
                  >
                    {startTrialMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-5 w-5" />
                    )}
                    {copy.startTrial}
                  </Button>
                ) : null}
                {billing.management.canUpgrade ? (
                  <Button
                    size="lg"
                    variant={billing.management.canStartTrial ? "outline" : "default"}
                    onClick={() =>
                      checkoutMutation.mutate(
                        (featuredPlan?.code as Exclude<BillingPlanCode, "free">) ??
                          "starter-monthly"
                      )
                    }
                    disabled={checkoutMutation.isPending}
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-5 w-5" />
                    )}
                    {copy.upgradePlan}
                  </Button>
                ) : null}
                <div className="flex flex-col justify-center text-sm text-muted-foreground">
                  {isFreePlan
                    ? "Unlimited entries and receipts, exports, AI assistant, and multi-location."
                    : "Keep exports, AI, and multi-location ready for your team."}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/60 bg-card/80 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>{copy.currentPlan}</CardDescription>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  {currentPlan?.name ?? billing.subscription.planCode}
                </CardTitle>
                <Badge className="rounded-full px-3 py-1">
                  {billing.subscription.status === "active"
                    ? copy.active
                    : billing.subscription.status}
                </Badge>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                {currentPlan?.summary}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <div className="text-muted-foreground">{copy.planStatus}</div>
                <div className="mt-1 text-lg font-semibold capitalize">
                  {billing.subscription.status.replace(/_/g, " ")}
                </div>
              </div>
              {currentPlan ? (
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="text-muted-foreground">{copy.currentPlan}</div>
                  <div className="mt-1 text-lg font-semibold">
                    {currentPlan.priceCents === 0
                      ? "€0"
                      : `${formatPrice(currentPlan.priceCents, currentPlan.currency)} / ${copy.billedMonthly}`}
                  </div>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {(currentPlan?.highlights ?? []).slice(0, 3).map((highlight) => (
                  <Badge key={highlight} variant="secondary" className="rounded-full">
                    {highlight}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardDescription>{copy.usage}</CardDescription>
              <CardTitle className="text-2xl">{copy.usage}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {billing.usage.map((metric) => {
                const percent =
                  metric.percentUsed === null ? 0 : Math.round(metric.percentUsed * 100);
                const nudge =
                  isFreePlan &&
                  (metric.limit === null ? false : percent >= 60 || metric.remaining === 0);
                return (
                  <div
                    key={metric.key}
                    className={cn(
                      "rounded-2xl border p-4",
                      nudge ? "border-amber-500/35 bg-amber-500/8" : "border-border/60 bg-muted/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{metric.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {copy.usageLabels.usedOf(
                            metric.used,
                            metric.limit === null ? copy.noLimit : String(metric.limit)
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        {metric.remaining === null ? copy.noLimit : `${metric.remaining} left`}
                      </Badge>
                    </div>
                    <Progress className="mt-4 h-2" value={percent} />
                    <div className="mt-3 text-xs text-muted-foreground">
                      {copy.usageLabels.currentPeriod}:{" "}
                      {formatPeriod(metric.periodStart, metric.periodEnd)}
                    </div>
                    {nudge ? (
                      <div className="mt-3 text-sm text-amber-200">
                        Upgrade for unlimited {metric.label.toLowerCase()} and exports.
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/8 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <div>
                    <div className="font-medium">
                      {upgradeContext.isOverEntitlement ? copy.trialExpired : copy.recommendedTitle}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {upgradeContext.isOverEntitlement
                        ? (upgradeContext.overEntitlementReasons[0]?.message ??
                          copy.trialExpiredDescription)
                        : copy.recommendedDescription}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardDescription>{copy.featureAccess}</CardDescription>
              <CardTitle className="text-2xl">{copy.featureAccess}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {featureEntries.map((feature) => {
                const Icon = featureIconMap[feature.key] ?? CheckCircle2;
                const isEnabled = typeof feature.value === "boolean" ? feature.value : true;

                return (
                  <div
                    key={feature.key}
                    className={cn(
                      "rounded-2xl border p-4",
                      isEnabled
                        ? "border-emerald-500/25 bg-emerald-500/8"
                        : "border-border/60 bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "rounded-full p-2",
                          isEnabled
                            ? "bg-emerald-500/12 text-emerald-700"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {copy.featureLabels[feature.labelKey]}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {featureValueToText(feature.value, copy.noLimit)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <BillingPlanCatalog
            orderedPlans={orderedPlans}
            currentPlanCode={billing.subscription.planCode}
            featuredPlanCode={featuredPlan?.code}
            copy={copy}
            onUpgrade={(planCode) => checkoutMutation.mutate(planCode)}
            isPending={checkoutMutation.isPending}
          />
        </div>
      </div>

      <Dialog open={startTrialMutation.isPending} onOpenChange={() => undefined}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.trialTitle}</DialogTitle>
            <DialogDescription>{copy.trialDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {copy.loading}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
