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
    <Card id="plan-catalog" className="rounded-3xl border-border/60 shadow-sm">
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
                "rounded-2xl border p-5 transition-shadow",
                isFeatured
                  ? "border-emerald-400/50 bg-emerald-500/10 shadow-[0_25px_70px_-45px_rgba(16,185,129,0.8)]"
                  : isCurrent
                    ? "border-emerald-500/30 bg-emerald-500/8"
                    : "border-border/60 bg-muted/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{plan.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{plan.summary}</div>
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
                {plan.priceCents === 0
                  ? "€0"
                  : `${formatPrice(plan.priceCents, plan.currency)} / mo`}
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                {plan.highlights.map((highlight) => (
                  <div key={highlight} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{highlight}</span>
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
