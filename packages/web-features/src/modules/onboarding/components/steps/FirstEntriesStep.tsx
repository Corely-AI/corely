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
import {
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  ListPlus,
  ReceiptText,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";
import { cn } from "@corely/web-shared/shared/lib/utils";

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
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { type: "income", amount: "", note: "" },
    mode: "onChange",
  });

  const entryType = watch("type");

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
      className="flex w-full flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out"
      data-testid="onboarding-step-first-entries"
    >
      <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-accent/10 text-accent glow-accent border border-accent/20">
        <ListPlus className="h-10 w-10" />
      </div>

      <div className="max-w-2xl space-y-4 mb-12">
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

      {entriesAdded > 0 && (
        <div className="mb-12 p-8 rounded-[2.5rem] bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 flex items-center gap-6 animate-in zoom-in duration-700 shadow-2xl shadow-emerald-500/5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 glow-emerald">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-xl font-black text-emerald-300 tracking-tight">
              {t("onboarding.entries.successTitle")}
            </p>
            <p className="text-lg text-emerald-400/70 font-medium">
              {t("onboarding.entries.successOne")}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12 max-w-2xl">
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="space-y-4">
              <Label
                htmlFor="type"
                className="text-xs font-black uppercase tracking-[0.2em] text-accent/80 ml-2"
              >
                {t("onboarding.entries.typeLabel")}
              </Label>
              <Select
                value={entryType}
                onValueChange={(v: "income" | "expense") =>
                  setValue("type", v, { shouldValidate: true })
                }
              >
                <SelectTrigger
                  id="type"
                  className="h-20 px-8 text-xl font-bold rounded-[1.5rem] border-white/5 bg-white/[0.02] transition-all duration-500 focus:ring-8 focus:ring-accent/5 focus:border-accent/40"
                  data-testid="onboarding-entry-type"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50 rounded-2xl backdrop-blur-xl p-2">
                  <SelectItem
                    value="income"
                    className="rounded-xl px-4 py-3 focus:bg-emerald-500 focus:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <ArrowDownToLine className="h-5 w-5 text-emerald-500 group-focus:text-white" />
                      {t("onboarding.entries.typeIncome")}
                    </div>
                  </SelectItem>
                  <SelectItem
                    value="expense"
                    className="rounded-xl px-4 py-3 focus:bg-orange-500 focus:text-white"
                  >
                    <div className="flex items-center gap-3">
                      <ArrowUpFromLine className="h-5 w-5 text-orange-500 group-focus:text-white" />
                      {t("onboarding.entries.typeExpense")}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label
                htmlFor="amount"
                className="text-xs font-black uppercase tracking-[0.2em] text-accent/80 ml-2"
              >
                {t("onboarding.entries.amountLabel", { symbol: currencySymbol })}
              </Label>
              <div className="relative group">
                <Input
                  id="amount"
                  placeholder="0.00"
                  {...register("amount")}
                  className={cn(
                    "h-20 px-8 text-2xl font-bold rounded-[1.5rem] border-white/5 bg-white/[0.02] transition-all duration-500",
                    "focus:ring-8 focus:ring-accent/5 focus:border-accent/40",
                    errors.amount && "border-destructive/50"
                  )}
                  data-testid="onboarding-entry-amount"
                />
              </div>
              {errors.amount && (
                <p
                  className="text-sm font-bold text-destructive mt-2 px-4 animate-in shake-2"
                  data-testid="onboarding-entry-amount-error"
                >
                  {errors.amount.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Label
              htmlFor="note"
              className="text-xs font-black uppercase tracking-[0.2em] text-accent/80 ml-2"
            >
              {t("onboarding.entries.descLabel")}
            </Label>
            <div className="relative group">
              <ReceiptText className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground/20 group-focus-within:text-accent/50 transition-colors" />
              <Input
                id="note"
                placeholder={t("onboarding.entries.descPlaceholder")}
                {...register("note")}
                className={cn(
                  "h-20 pl-16 pr-8 text-xl font-bold rounded-[1.5rem] border-white/5 bg-white/[0.02] transition-all duration-500",
                  "focus:ring-8 focus:ring-accent/5 focus:border-accent/40",
                  errors.note && "border-destructive/50"
                )}
                data-testid="onboarding-entry-note"
              />
            </div>
            {errors.note && (
              <p
                className="text-sm font-bold text-destructive mt-2 px-4 animate-in shake-2"
                data-testid="onboarding-entry-note-error"
              >
                {errors.note.message}
              </p>
            )}
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row gap-6">
          <Button
            type="submit"
            size="lg"
            className={cn(
              "h-20 px-14 rounded-[2rem] text-xl font-black transition-all duration-500 group flex-1",
              isValid
                ? "bg-accent text-accent-foreground hover:glow-accent-strong hover:scale-[1.05] active:scale-[0.95] shadow-2xl shadow-accent/20"
                : "bg-white/5 text-muted-foreground/30 border border-white/5"
            )}
            disabled={!isValid || isSaving}
            data-testid="onboarding-entry-submit"
          >
            <span className="flex items-center justify-center gap-4">
              {cta}
              <ArrowRight
                className={cn(
                  "h-6 w-6 transition-transform duration-500",
                  (isValid || entriesAdded > 0) && "group-hover:translate-x-2"
                )}
              />
            </span>
          </Button>

          {entriesAdded > 0 && (
            <Button
              variant="ghost"
              type="button"
              className="h-20 px-10 rounded-[2rem] text-lg font-black text-muted-foreground/50 hover:text-foreground hover:bg-white/5 transition-all duration-500"
              onClick={() => onAdvance()}
              data-testid="onboarding-entry-skip-second"
            >
              {t("onboarding.entries.skipSecond")}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
