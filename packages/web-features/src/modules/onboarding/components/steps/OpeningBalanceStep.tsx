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
import { ArrowRight, Coins } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

const formSchema = z.object({
  balance: z.string().regex(/^\d+([.,]\d{1,2})?$/, "Valid amount required"),
});

type FormValues = z.infer<typeof formSchema>;

export const OpeningBalanceStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const analytics = useOnboardingAnalytics();

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

    // In real implementation we'd create the cash register here and insert
    // the OPENING_FLOAT entry via API.
    onAdvance({ openingBalanceCents: cents });
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || "Set Balance";

  return (
    <div className="mx-auto flex max-w-md flex-col p-6 lg:p-12">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
        <Coins className="h-6 w-6" />
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mb-8 text-muted-foreground">{desc}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="balance" className="text-base font-semibold">
            Real cash currently in register
          </Label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-xl text-muted-foreground mr-2 font-medium">
              €
            </span>
            <Input
              id="balance"
              placeholder="0.00"
              autoFocus
              className="pl-8 text-xl font-medium h-14"
              {...register("balance")}
            />
          </div>
          {errors.balance && <p className="text-sm text-destructive">{errors.balance.message}</p>}
          <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg border">
            💡 Do not include card payments or bank transfers. Only physical cash.
          </p>
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            type="submit"
            size="lg"
            className="group gap-2 w-full sm:w-auto"
            disabled={!isValid || isSaving}
          >
            <span>{cta}</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </form>
    </div>
  );
};
