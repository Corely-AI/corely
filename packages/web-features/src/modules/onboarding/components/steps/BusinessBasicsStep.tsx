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
import { ArrowRight, Store } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

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
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || "Continue";

  return (
    <div
      className="mx-auto flex max-w-md flex-col p-6 lg:p-12"
      data-testid="onboarding-step-business-basics"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
        <Store className="h-6 w-6" />
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
        <div className="space-y-2">
          <Label htmlFor="name">{t("onboarding.businessName")}</Label>
          <Input
            id="name"
            placeholder={t("onboarding.businessNamePlaceholder")}
            {...register("name")}
            className={errors.name ? "border-destructive" : ""}
            data-testid="onboarding-business-name"
          />
          {errors.name && (
            <p className="text-sm text-destructive" data-testid="onboarding-business-name-error">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">{t("onboarding.businessType")}</Label>
          <Select onValueChange={(v) => setValue("category", v, { shouldValidate: true })}>
            <SelectTrigger
              id="category"
              className={errors.category ? "border-destructive" : ""}
              data-testid="onboarding-business-category"
            >
              <SelectValue placeholder={t("onboarding.selectType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beauty" data-testid="onboarding-business-category-beauty">
                {t("onboarding.categories.beauty")}
              </SelectItem>
              <SelectItem value="hair" data-testid="onboarding-business-category-hair">
                {t("onboarding.categories.hair")}
              </SelectItem>
              <SelectItem value="gastronomy" data-testid="onboarding-business-category-gastronomy">
                {t("onboarding.categories.gastronomy")}
              </SelectItem>
              <SelectItem value="retail" data-testid="onboarding-business-category-retail">
                {t("onboarding.categories.retail")}
              </SelectItem>
              <SelectItem value="other" data-testid="onboarding-business-category-other">
                {t("onboarding.categories.other")}
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.category && (
            <p
              className="text-sm text-destructive"
              data-testid="onboarding-business-category-error"
            >
              {errors.category.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">{t("onboarding.currency")}</Label>
          <Select
            defaultValue="EUR"
            onValueChange={(v) => setValue("currency", v, { shouldValidate: true })}
          >
            <SelectTrigger id="currency" data-testid="onboarding-business-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR" data-testid="onboarding-business-currency-EUR">
                EUR (€)
              </SelectItem>
              <SelectItem value="USD" data-testid="onboarding-business-currency-USD">
                USD ($)
              </SelectItem>
              <SelectItem value="VND" data-testid="onboarding-business-currency-VND">
                VND (₫)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            type="submit"
            size="lg"
            className="group gap-2 w-full sm:w-auto"
            disabled={!isValid || isSaving}
            data-testid="onboarding-business-next"
          >
            <span>{cta}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </form>
    </div>
  );
};
