import React from "react";
import { Button, Card, CardContent } from "@corely/ui";
import { ArrowRight, TrendingUp, TrendingDown, AlignVerticalDistributeCenter } from "lucide-react";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { useOnboarding } from "../../engine/use-onboarding";

export const TodayStatusStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const analytics = useOnboardingAnalytics();

  // Pull mock data from the progress state answers
  const { progress } = useOnboarding({ config: config as any }); // Need exact config ref

  // Find opening balance answer
  const obStepId = "opening-balance";
  const obCents =
    typeof progress?.steps[obStepId]?.answers?.openingBalanceCents === "number"
      ? (progress.steps[obStepId].answers!.openingBalanceCents as number)
      : 15000; // Mock €150.00

  // Mock sums based on standard inputs
  const incomeCents = 2550; // €25.50
  const expenseCents = 820; // €8.20
  const currentCents = obCents + incomeCents - expenseCents;

  const formatEuro = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  const handleNext = () => {
    analytics.track("onboarding.today_status_viewed", { currentBalance: currentCents });
    onAdvance();
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];

  return (
    <div className="mx-auto flex max-w-lg flex-col p-6 lg:p-12">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <AlignVerticalDistributeCenter className="h-6 w-6" />
      </div>

      <h1 className="mb-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mb-10 text-lg text-muted-foreground">{desc}</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="col-span-2 overflow-hidden border-2 border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
              Expected Cash in Drawer
            </p>
            <div className="text-4xl font-bold text-primary tracking-tight">
              {formatEuro(currentCents)}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              <p className="text-sm font-medium text-muted-foreground">Today's Income</p>
            </div>
            <div className="text-xl font-semibold text-emerald-600">+{formatEuro(incomeCents)}</div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border shadow-sm">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-sm font-medium text-muted-foreground">Today's Expenses</p>
            </div>
            <div className="text-xl font-semibold text-red-600">-{formatEuro(expenseCents)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 bg-muted/40 rounded-xl border border-dashed border-border mb-10 text-sm flex gap-3">
        <div className="text-2xl pt-1">💡</div>
        <p className="text-muted-foreground">
          <strong className="text-foreground">This is your cash status.</strong> Your expected
          balance is automatically updated every time you add an entry. No more manual calculations
          at the end of the day.
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="lg" className="group gap-2" onClick={handleNext} disabled={isSaving}>
          <span>See what's next</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
};
