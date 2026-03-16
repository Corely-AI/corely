import React from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import { useTranslation } from "react-i18next";
import { ArrowRight, Store, ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { cn } from "@corely/web-shared/shared/lib/utils";

const createFormSchema = (t: any) =>
  z.object({
    name: z.string().min(1, t("onboarding.businessNameRequired")),
    category: z.string().min(1, t("onboarding.businessTypeRequired")),
    currency: z.string().min(3),
  });

type FormValues = {
  name: string;
  category: string;
  currency: string;
};

export const BusinessBasicsStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const { t } = useTranslation();
  const analytics = useOnboardingAnalytics();

  const formSchema = React.useMemo(() => createFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isValid },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category: "",
      currency: "EUR",
    },
    mode: "onChange",
  });

  const onSubmit = (data: FormValues) => {
    analytics.track("onboarding.business_created", {
      category: data.category,
      currency: data.currency,
    });
    onAdvance(data);
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || t("common.next");

  return (
    <div
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-business-basics"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <Store className="h-10 w-10" />
      </div>

      <div className="max-w-2xl space-y-4 mb-16">
        <h1
          className="text-6xl font-black tracking-tight sm:text-7xl bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent leading-[0.95]"
          data-testid="onboarding-step-title"
        >
          {title}
        </h1>
        <p
          className="text-2xl text-muted-foreground/80 leading-relaxed max-w-xl font-medium"
          data-testid="onboarding-step-description"
        >
          {desc}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-16 max-w-2xl">
        <div className="space-y-12">
          <div className="space-y-4">
            <Label
              htmlFor="name"
              className="text-xs font-black uppercase tracking-[0.2em] text-accent/80 ml-2"
            >
              {t("onboarding.businessName")}
            </Label>
            <Input
              id="name"
              autoFocus
              placeholder={t("onboarding.businessNamePlaceholder")}
              {...register("name")}
              className={cn(
                "h-24 px-8 text-3xl font-bold rounded-[2rem] border-white/5 bg-white/[0.02] transition-all duration-500",
                "focus:ring-[12px] focus:ring-accent/5 focus:border-accent/40 focus:bg-accent/[0.03] focus:glow-accent-subtle",
                errors.name &&
                  "border-destructive/50 focus:border-destructive/60 focus:ring-destructive/5"
              )}
              data-testid="onboarding-business-name"
            />
            {errors.name && (
              <p
                className="text-sm font-bold text-destructive mt-3 px-4 animate-in shake-2 duration-300"
                data-testid="onboarding-business-name-error"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="space-y-4">
              <Label
                htmlFor="category"
                className="text-xs font-black uppercase tracking-[0.2em] text-accent/80 ml-2"
              >
                {t("onboarding.businessType")}
              </Label>
              <Select onValueChange={(v) => setValue("category", v, { shouldValidate: true })}>
                <SelectTrigger
                  id="category"
                  className={cn(
                    "h-20 px-8 text-xl font-bold rounded-[1.5rem] border-white/5 bg-white/[0.02] transition-all duration-500",
                    "focus:ring-8 focus:ring-accent/5 focus:border-accent/40 focus:bg-accent/[0.03]",
                    errors.category && "border-destructive/50"
                  )}
                  data-testid="onboarding-business-category"
                >
                  <SelectValue placeholder={t("onboarding.selectType")} />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50 rounded-2xl backdrop-blur-xl p-2">
                  <SelectItem
                    value="beauty"
                    className="rounded-xl px-4 py-3 focus:bg-accent focus:text-accent-foreground"
                  >
                    {t("onboarding.categories.beauty")}
                  </SelectItem>
                  <SelectItem
                    value="hair"
                    className="rounded-xl px-4 py-3 focus:bg-accent focus:text-accent-foreground"
                  >
                    {t("onboarding.categories.hair")}
                  </SelectItem>
                  <SelectItem
                    value="gastronomy"
                    className="rounded-xl px-4 py-3 focus:bg-accent focus:text-accent-foreground"
                  >
                    {t("onboarding.categories.gastronomy")}
                  </SelectItem>
                  <SelectItem
                    value="retail"
                    className="rounded-xl px-4 py-3 focus:bg-accent focus:text-accent-foreground"
                  >
                    {t("onboarding.categories.retail")}
                  </SelectItem>
                  <SelectItem
                    value="other"
                    className="rounded-xl px-4 py-3 focus:bg-accent focus:text-accent-foreground"
                  >
                    {t("onboarding.categories.other")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label
                htmlFor="currency"
                className="text-xs font-black uppercase tracking-[0.2em] text-accent/80 ml-2"
              >
                {t("onboarding.currency")}
              </Label>
              <Select
                defaultValue="EUR"
                onValueChange={(v) => setValue("currency", v, { shouldValidate: true })}
              >
                <SelectTrigger
                  id="currency"
                  className="h-20 px-8 text-xl font-bold rounded-[1.5rem] border-white/5 bg-white/[0.02] transition-all duration-500 focus:ring-8 focus:ring-accent/5 focus:border-accent/40"
                  data-testid="onboarding-business-currency"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50 rounded-2xl backdrop-blur-xl p-2">
                  <SelectItem value="EUR" className="rounded-xl px-4 py-3">
                    EUR (€)
                  </SelectItem>
                  <SelectItem value="USD" className="rounded-xl px-4 py-3">
                    USD ($)
                  </SelectItem>
                  <SelectItem value="VND" className="rounded-xl px-4 py-3">
                    VND (₫)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="pt-8 w-full sm:w-auto">
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
            data-testid="onboarding-business-next"
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
