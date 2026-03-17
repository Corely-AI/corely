import type { BillingPlanCode, BillingPlanDefinition } from "@corely/contracts";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
} from "@corely/ui";
import { CheckCircle2 } from "lucide-react";

import type { BillingCopy } from "./billing-copy";
import { formatPrice, isPaidPlan } from "./billing-utils";

interface BillingPlanCatalogProps {
  orderedPlans: BillingPlanDefinition[];
  currentPlanCode: BillingPlanCode;
  featuredPlanCode?: BillingPlanCode | null;
  copy: BillingCopy;
  onUpgrade: (planCode: Exclude<BillingPlanCode, "free">) => void;
  isPending: boolean;
}

export function BillingPlanCatalog({
  orderedPlans,
  currentPlanCode,
  featuredPlanCode,
  copy,
  onUpgrade,
  isPending,
}: BillingPlanCatalogProps) {
  return (
    <Card id="plan-catalog" className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardDescription>{copy.planCatalog}</CardDescription>
        <CardTitle className="text-2xl">{copy.planCatalog}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {orderedPlans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          const canUpgrade = !isCurrent && plan.code !== "free";
          const paidPlanCode = isPaidPlan(plan.code) ? plan.code : null;
          const isFeatured = plan.code === featuredPlanCode;

          return (
            <div
              key={plan.code}
              className={cn(
                "rounded-lg border p-5 transition-shadow",
                isFeatured
                  ? "border-emerald-400/40 bg-emerald-500/8"
                  : isCurrent
                    ? "border-emerald-500/30 bg-emerald-500/8"
                    : "border-border/60 bg-muted/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{copy.planName(plan.code, plan.name)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {copy.planSummary(plan.code, plan.summary)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isFeatured ? (
                    <Badge className="rounded-full bg-emerald-500/20 text-emerald-100">
                      {copy.recommendedTitle}
                    </Badge>
                  ) : null}
                  {isCurrent ? (
                    <Badge className="rounded-full">{copy.currentPlanBadge}</Badge>
                  ) : null}
                </div>
              </div>
              <div className="mt-4 text-2xl font-semibold">
                {copy.pricePerMonth(
                  plan.priceCents === 0 ? "€0" : formatPrice(plan.priceCents, plan.currency)
                )}
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {plan.highlights.map((highlight, index) => (
                  <div key={highlight} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{copy.planHighlight(plan.code, index, highlight)}</span>
                  </div>
                ))}
              </div>
              {canUpgrade && paidPlanCode ? (
                <Button
                  className="mt-5 w-full"
                  variant={isFeatured ? "default" : "outline"}
                  onClick={() => onUpgrade(paidPlanCode)}
                  disabled={isPending}
                >
                  {copy.upgradePlan}
                </Button>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
