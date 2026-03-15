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
import { ArrowRight, Store } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { StepComponentProps } from "../OnboardingStepRenderer";
import { useOnboardingAnalytics } from "../../engine/use-onboarding-analytics";

const formSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  category: z.string().min(1, "Category is required"),
  currency: z.string().min(3),
});

type FormValues = z.infer<typeof formSchema>;

export const BusinessBasicsStep = ({ config, locale, onAdvance, isSaving }: StepComponentProps) => {
  const analytics = useOnboardingAnalytics();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
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

    // In a real implementation this might fire a mutation to create the workspace/tenant
    // or register. For now, we save it as step answers.
    onAdvance(data);
  };

  const title = config.title[locale] || config.title["en"];
  const desc = config.description[locale] || config.description["en"];
  const cta = config.ctaLabel?.[locale] || config.ctaLabel?.["en"] || "Continue";

  return (
    <div className="mx-auto flex max-w-md flex-col p-6 lg:p-12">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
        <Store className="h-6 w-6" />
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mb-8 text-muted-foreground">{desc}</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Business Name</Label>
          <Input
            id="name"
            placeholder="e.g. Bella Beauty Studio"
            {...register("name")}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Business Type</Label>
          <Select onValueChange={(v) => setValue("category", v, { shouldValidate: true })}>
            <SelectTrigger id="category" className={errors.category ? "border-destructive" : ""}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beauty">Nail / Beauty Salon</SelectItem>
              <SelectItem value="hair">Hairdresser / Barber</SelectItem>
              <SelectItem value="gastronomy">Café / Restaurant</SelectItem>
              <SelectItem value="retail">Retail Shop</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select
            defaultValue="EUR"
            onValueChange={(v) => setValue("currency", v, { shouldValidate: true })}
          >
            <SelectTrigger id="currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="VND">VND (₫)</SelectItem>
            </SelectContent>
          </Select>
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
