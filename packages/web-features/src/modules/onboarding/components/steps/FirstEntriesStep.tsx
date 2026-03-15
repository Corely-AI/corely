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
import { ArrowRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

const formSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().regex(/^\d+([.,]\d{1,2})?$/, "Valid amount required"),
  note: z.string().min(1, "Note is required"),
});

type FormValues = z.infer<typeof formSchema>;

export const FirstEntriesStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const analytics = useOnboardingAnalytics();
  const [entriesAdded, setEntriesAdded] = useState(0);

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

    // In real app: call API to add cash entry

    setEntriesAdded((p) => p + 1);

    if (entriesAdded >= 1) {
      // Done adding 2 entries (or more), move on
      onAdvance();
    } else {
      // Switch to the other type to guide them
      reset({
        type: data.type === "income" ? "expense" : "income",
        amount: "",
        note: "",
      });
    }
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = entriesAdded > 0 ? "Continue" : "Add Entry";

  return (
    <div className="mx-auto flex max-w-md flex-col p-6 lg:p-12">
      <div className="mb-4 flex h-12 w-12 items-center gap-1 justify-center rounded-xl bg-blue-500/10 text-blue-500">
        <ArrowDownToLine className="h-5 w-5" />
        <ArrowUpFromLine className="h-5 w-5" />
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mb-4 text-muted-foreground">{desc}</p>

      {entriesAdded > 0 && (
        <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-800 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-200 text-xs font-bold leading-none text-emerald-700">
            1
          </span>
          Great! You added your first entry. Let's do one more.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-1 space-y-2">
            <Label htmlFor="type">Transaction Type</Label>
            <Select
              defaultValue={entriesAdded === 0 ? "income" : "expense"}
              onValueChange={(v: "income" | "expense") =>
                setValue("type", v, { shouldValidate: true })
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Cash Income</SelectItem>
                <SelectItem value="expense">Cash Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-1 space-y-2">
            <Label htmlFor="amount">Amount (€)</Label>
            <Input
              id="amount"
              placeholder="0.00"
              {...register("amount")}
              className={errors.amount ? "border-destructive" : ""}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Description</Label>
          <Input
            id="note"
            placeholder="e.g. Haircut or Coffee supplies"
            {...register("note")}
            className={errors.note ? "border-destructive" : ""}
          />
          {errors.note && <p className="text-sm text-destructive">{errors.note.message}</p>}
        </div>

        <div className="pt-4 flex w-full justify-between items-center">
          {entriesAdded > 0 ? (
            <Button variant="ghost" type="button" onClick={() => onAdvance()}>
              Skip Second Entry
            </Button>
          ) : (
            <div />
          )}
          <Button
            type="submit"
            size="lg"
            className="group gap-2 w-full sm:w-auto"
            disabled={!isValid || isSaving}
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
