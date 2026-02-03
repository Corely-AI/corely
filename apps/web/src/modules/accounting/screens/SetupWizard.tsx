import React, { type FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Calculator, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@corely/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { RadioGroup, RadioGroupItem } from "@corely/ui";
import { Label } from "@corely/ui";
import { useSetupAccounting } from "../queries";

const setupFormSchema = z.object({
  baseCurrency: z.string().min(3).max(3),
  fiscalYearStartMonthDay: z.string().regex(/^\d{2}-\d{2}$/),
  periodLockingEnabled: z.boolean(),
  entryNumberPrefix: z.string().min(1),
  template: z.enum(["minimal", "freelancer", "smallBusiness", "standard"]),
});

type SetupFormData = z.infer<typeof setupFormSchema>;

/**
 * Setup wizard for initializing accounting module
 */
export const SetupWizard: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setupMutation = useSetupAccounting();

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      baseCurrency: "EUR",
      fiscalYearStartMonthDay: "01-01",
      periodLockingEnabled: false,
      entryNumberPrefix: "JE-",
      template: "standard",
    },
  });

  const onSubmit = async (data: SetupFormData) => {
    await setupMutation.mutateAsync({
      baseCurrency: data.baseCurrency,
      fiscalYearStartMonthDay: data.fiscalYearStartMonthDay,
      periodLockingEnabled: data.periodLockingEnabled,
      entryNumberPrefix: data.entryNumberPrefix,
      template: data.template,
    });
    navigate("/accounting");
  };

  const templates = [
    {
      value: "minimal" as const,
      label: t("accounting.setup.templates.minimal.label"),
      description: t("accounting.setup.templates.minimal.description"),
    },
    {
      value: "freelancer" as const,
      label: t("accounting.setup.templates.freelancer.label"),
      description: t("accounting.setup.templates.freelancer.description"),
    },
    {
      value: "smallBusiness" as const,
      label: t("accounting.setup.templates.smallBusiness.label"),
      description: t("accounting.setup.templates.smallBusiness.description"),
    },
    {
      value: "standard" as const,
      label: t("accounting.setup.templates.standard.label"),
      description: t("accounting.setup.templates.standard.description"),
    },
  ];

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Calculator className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">{t("accounting.setup.title")}</h1>
        <p className="text-muted-foreground">{t("accounting.setup.subtitle")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t("accounting.setup.basic.title")}</CardTitle>
              <CardDescription>{t("accounting.setup.basic.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounting.setup.baseCurrency")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("accounting.setup.selectCurrency")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EUR">EUR - {t("common.currencies.eur")}</SelectItem>
                        <SelectItem value="USD">USD - {t("common.currencies.usd")}</SelectItem>
                        <SelectItem value="GBP">GBP - {t("common.currencies.gbp")}</SelectItem>
                        <SelectItem value="CHF">CHF - {t("common.currencies.chf")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("accounting.setup.baseCurrencyHelp")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiscalYearStartMonthDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("accounting.setup.fiscalYearStart")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("accounting.setup.selectFiscalStart")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="01-01">
                          {t("accounting.setup.fiscalStart.jan1")}
                        </SelectItem>
                        <SelectItem value="04-01">
                          {t("accounting.setup.fiscalStart.apr1")}
                        </SelectItem>
                        <SelectItem value="07-01">
                          {t("accounting.setup.fiscalStart.jul1")}
                        </SelectItem>
                        <SelectItem value="10-01">
                          {t("accounting.setup.fiscalStart.oct1")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>{t("accounting.setup.fiscalYearHelp")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodLockingEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t("accounting.setup.periodLocking")}</FormLabel>
                      <FormDescription>{t("accounting.setup.periodLockingHelp")}</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Chart of Accounts Template */}
          <Card>
            <CardHeader>
              <CardTitle>{t("accounting.setup.chartOfAccountsTitle")}</CardTitle>
              <CardDescription>{t("accounting.setup.chartOfAccountsDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid gap-4"
                      >
                        {templates.map((template) => (
                          <div key={template.value}>
                            <RadioGroupItem
                              value={template.value}
                              id={template.value}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={template.value}
                              className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{template.label}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {template.description}
                              </p>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {t("accounting.setup.next.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{t("accounting.setup.next.line1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{t("accounting.setup.next.line2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{t("accounting.setup.next.line3")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{t("accounting.setup.next.line4")}</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={setupMutation.isPending}>
              {setupMutation.isPending
                ? t("accounting.setup.settingUp")
                : t("accounting.setup.complete")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
