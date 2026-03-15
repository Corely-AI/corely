import React from "react";
import { Button, Input, Label } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { ArrowRight, Coins } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

const createFormSchema = (t: any) =>
  z.object({
    balance: z.string().regex(/^\d+([.,]\d{1,2})?$/, t("onboarding.openingBalance.errorAmount")),
  });

type FormValues = {
  balance: string;
};

export const OpeningBalanceStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const { t } = useTranslation();
  const analytics = useOnboardingAnalytics();

  const formSchema = React.useMemo(() => createFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const onSubmit = (data: FormValues) => {
    // Convert to cents
    const floatVal = parseFloat(data.balance.replace(",", "."));
    const cents = Math.round(floatVal * 100);

    analytics.track("onboarding.opening_balance_set", { cents });

    onAdvance({ openingBalanceCents: cents });
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || t("onboarding.allSet");

  const currencySymbol = locale === "vi" ? "₫" : "€";

  return (
    <div
      className="mx-auto flex max-w-md flex-col p-6 lg:p-12"
      data-testid="onboarding-step-opening-balance"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
        <Coins className="h-6 w-6" />
      </div>

      <h1
        className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl"
        data-testid="onboarding-step-title"
      >
        {title}
      </h1>
      <p className="mb-8 text-muted-foreground" data-testid="onboarding-step-description">
        {desc}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="balance" className="text-base font-semibold">
            {t("onboarding.openingBalance.label")}
          </Label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xl text-muted-foreground mr-2 font-medium">
              {currencySymbol}
            </span>
            <Input
              id="balance"
              placeholder="0.00"
              autoFocus
              className="pl-8 text-xl font-medium h-14"
              {...register("balance")}
              data-testid="onboarding-opening-balance-input"
            />
          </div>
          {errors.balance && (
            <p className="text-sm text-destructive" data-testid="onboarding-opening-balance-error">
              {errors.balance.message}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg border">
            {t("onboarding.openingBalance.hint")}
          </p>
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            type="submit"
            size="lg"
            className="group gap-2 w-full sm:w-auto"
            disabled={!isValid || isSaving}
            data-testid="onboarding-opening-balance-next"
          >
            <span>{cta}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </form>
    </div>
  );
};
