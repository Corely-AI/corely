import React from "react";
import { Button, Input, Label } from "@corely/ui";
import { useTranslation } from "react-i18next";
import { ArrowRight, Coins, Info, Calculator } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { cn } from "@corely/web-shared/shared/lib/utils";

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
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  const balanceValue = watch("balance");

  const onSubmit = (data: FormValues) => {
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
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-4 duration-700"
      data-testid="onboarding-step-opening-balance"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <Coins className="h-10 w-10" />
      </div>

      <div className="max-w-2xl space-y-4 mb-14">
        <h1
          className="text-5xl font-black tracking-tight sm:text-6xl bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent"
          data-testid="onboarding-step-title"
        >
          {title}
        </h1>
        <p
          className="text-xl text-muted-foreground/80 leading-relaxed max-w-xl"
          data-testid="onboarding-step-description"
        >
          {desc}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <Label
                htmlFor="balance"
                className="text-xs font-black uppercase tracking-[0.2em] text-accent/80"
              >
                {t("onboarding.openingBalance.label")}
              </Label>
              <Calculator className="h-4 w-4 text-accent/30" />
            </div>

            <div className="relative group transition-all duration-500">
              <div className="absolute left-8 top-1/2 -translate-y-1/2 text-4xl font-bold text-muted-foreground/20 pointer-events-none group-focus-within:text-accent/40 group-focus-within:scale-110 transition-all duration-500">
                {currencySymbol}
              </div>
              <Input
                id="balance"
                placeholder="0.00"
                autoFocus
                className={cn(
                  "h-32 pl-20 text-6xl font-black rounded-[2.5rem] border-white/5 bg-white/[0.02] shadow-2xl transition-all duration-500",
                  "focus:ring-[12px] focus:ring-accent/5 focus:border-accent/40 focus:bg-accent/[0.03] focus:glow-accent-subtle",
                  errors.balance &&
                    "border-destructive/50 focus:border-destructive/60 focus:ring-destructive/5"
                )}
                {...register("balance")}
                data-testid="onboarding-opening-balance-input"
              />
            </div>

            {errors.balance && (
              <p
                className="text-sm font-bold text-destructive mt-3 px-6 animate-in shake-2 duration-300"
                data-testid="onboarding-opening-balance-error"
              >
                {errors.balance.message}
              </p>
            )}
          </div>

          <div className="flex gap-6 p-8 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 items-start backdrop-blur-sm group hover:border-white/10 transition-colors">
            <div className="mt-1 bg-accent/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
              <Info className="h-5 w-5 text-accent" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-bold text-foreground/90 uppercase tracking-wider">
                {t("onboarding.openingBalance.importantTip") || "Important Tip"}
              </p>
              <p className="text-lg text-muted-foreground/70 leading-relaxed font-medium">
                {t("onboarding.openingBalance.hint")}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row gap-6">
          <Button
            type="submit"
            size="lg"
            className={cn(
              "h-20 px-14 rounded-[2rem] text-xl font-black transition-all duration-500 group",
              isValid
                ? "bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] shadow-2xl shadow-accent/20"
                : "bg-white/5 text-muted-foreground/30 border border-white/5 cursor-not-allowed"
            )}
            disabled={!isValid || isSaving}
            data-testid="onboarding-opening-balance-next"
          >
            <span className="flex items-center gap-4">
              {cta}
              <ArrowRight
                className={cn(
                  "h-6 w-6 transition-transform duration-500",
                  isValid && "group-hover:translate-x-2"
                )}
              />
            </span>
          </Button>
        </div>
      </form>
    </div>
  );
};
