import React, { useState } from "react";
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
import { ArrowRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

const createFormSchema = (t: any) =>
  z.object({
    type: z.enum(["income", "expense"]),
    amount: z.string().regex(/^\d+([.,]\d{1,2})?$/, t("onboarding.entries.errorAmount")),
    note: z.string().min(1, t("onboarding.entries.errorNote")),
  });

type FormValues = {
  type: "income" | "expense";
  amount: string;
  note: string;
};

export const FirstEntriesStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const { t } = useTranslation();
  const analytics = useOnboardingAnalytics();
  const [entriesAdded, setEntriesAdded] = useState(0);

  const formSchema = React.useMemo(() => createFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: "income", amount: "", note: "" },
    mode: "onChange",
  });

  const onSubmit = (data: FormValues) => {
    const floatVal = parseFloat(data.amount.replace(",", "."));
    const cents = Math.round(floatVal * 100);

    if (data.type === "income") {
      analytics.track("onboarding.first_income_added", { cents, note: data.note });
    } else {
      analytics.track("onboarding.first_expense_added", { cents, note: data.note });
    }

    setEntriesAdded((p) => p + 1);

    if (entriesAdded >= 1) {
      onAdvance();
    } else {
      reset({
        type: data.type === "income" ? "expense" : "income",
        amount: "",
        note: "",
      });
    }
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta =
    entriesAdded > 0 ? t("onboarding.receipt.continueLabel") : t("onboarding.entries.ctaAdd");

  const currencySymbol = locale === "vi" ? "₫" : "€";

  return (
    <div
      className="mx-auto flex max-w-md flex-col p-6 lg:p-12"
      data-testid="onboarding-step-first-entries"
    >
      <div className="mb-4 flex h-12 w-12 items-center gap-1 justify-center rounded-xl bg-blue-500/10 text-blue-500">
        <ArrowDownToLine className="h-5 w-5" />
        <ArrowUpFromLine className="h-5 w-5" />
      </div>

      <h1
        className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl"
        data-testid="onboarding-step-title"
      >
        {title}
      </h1>
      <p className="mb-4 text-muted-foreground" data-testid="onboarding-step-description">
        {desc}
      </p>

      {entriesAdded > 0 && (
        <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold leading-none text-emerald-700">
            1
          </span>
          {t("onboarding.entries.successOne")}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1 space-y-2">
            <Label htmlFor="type">{t("onboarding.entries.typeLabel")}</Label>
            <Select
              defaultValue={entriesAdded === 0 ? "income" : "expense"}
              onValueChange={(v: "income" | "expense") =>
                setValue("type", v, { shouldValidate: true })
              }
            >
              <SelectTrigger id="type" data-testid="onboarding-entry-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income" data-testid="onboarding-entry-type-income">
                  {t("onboarding.entries.typeIncome")}
                </SelectItem>
                <SelectItem value="expense" data-testid="onboarding-entry-type-expense">
                  {t("onboarding.entries.typeExpense")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1 space-y-2">
            <Label htmlFor="amount">
              {t("onboarding.entries.amountLabel", { symbol: currencySymbol })}
            </Label>
            <Input
              id="amount"
              placeholder="0.00"
              {...register("amount")}
              className={errors.amount ? "border-destructive" : ""}
              data-testid="onboarding-entry-amount"
            />
            {errors.amount && (
              <p className="text-sm text-destructive" data-testid="onboarding-entry-amount-error">
                {errors.amount.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">{t("onboarding.entries.descLabel")}</Label>
          <Input
            id="note"
            placeholder={t("onboarding.entries.descPlaceholder")}
            {...register("note")}
            className={errors.note ? "border-destructive" : ""}
            data-testid="onboarding-entry-note"
          />
          {errors.note && (
            <p className="text-sm text-destructive" data-testid="onboarding-entry-note-error">
              {errors.note.message}
            </p>
          )}
        </div>

        <div className="pt-4 flex w-full justify-between items-center">
          {entriesAdded > 0 ? (
            <Button
              variant="ghost"
              type="button"
              onClick={() => onAdvance()}
              data-testid="onboarding-entry-skip-second"
            >
              {t("onboarding.entries.skipSecond")}
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="submit"
            size="lg"
            className="group gap-2 w-full sm:w-auto"
            disabled={!isValid || isSaving}
            data-testid="onboarding-entry-submit"
          >
            <span>{cta}</span>
            {entriesAdded > 0 && (
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
