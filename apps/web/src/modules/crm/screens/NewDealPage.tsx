import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { z } from "zod";
import { DEFAULT_PIPELINE_STAGES } from "@corely/contracts";
import { useTranslation } from "react-i18next";

import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import { crmApi } from "@/lib/crm-api";
import { customersApi } from "@/lib/customers-api";
import { cn } from "@/shared/lib/utils";
import { toast } from "sonner";

export default function NewDealPage() {
  const { t, i18n } = useTranslation();
  const dealFormSchema = useMemo(
    () =>
      z.object({
        title: z.string().min(1, t("crm.deals.validation.titleRequired")),
        partyId: z.string().min(1, t("crm.deals.validation.customerRequired")),
        stageId: z.string().min(1, t("crm.deals.validation.stageRequired")),
        amount: z
          .string()
          .optional()
          .refine(
            (val) => !val || !Number.isNaN(Number(val)),
            t("crm.deals.validation.amountNumber")
          ),
        currency: z.string().min(1, t("crm.deals.validation.currencyRequired")),
        expectedCloseDate: z.string().optional(),
        probability: z
          .string()
          .optional()
          .refine(
            (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
            t("crm.deals.validation.probabilityRange")
          ),
        notes: z.string().optional(),
        tags: z.string().optional(),
      }),
    [t]
  );
  type DealFormValues = z.infer<typeof dealFormSchema>;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const customers = customersData?.customers ?? [];

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: "",
      partyId: "",
      stageId: DEFAULT_PIPELINE_STAGES[0]?.id ?? "lead",
      amount: "",
      currency: "EUR",
      expectedCloseDate: "",
      probability: "",
      notes: "",
      tags: "",
    },
  });

  const createDealMutation = useMutation({
    mutationFn: async (values: DealFormValues) => {
      const amountValue = values.amount?.trim();
      const amountCents =
        amountValue && !Number.isNaN(Number(amountValue))
          ? Math.round(Number(amountValue) * 100)
          : undefined;
      const probabilityValue = values.probability?.trim();
      const tags =
        values.tags
          ?.split(",")
          .map((tag) => tag.trim())
          .filter(Boolean) ?? [];

      const deal = await crmApi.createDeal({
        title: values.title,
        partyId: values.partyId,
        stageId: values.stageId || "lead",
        amountCents,
        currency: values.currency,
        expectedCloseDate: values.expectedCloseDate || undefined,
        probability:
          probabilityValue && !Number.isNaN(Number(probabilityValue))
            ? Number(probabilityValue)
            : undefined,
        notes: values.notes || undefined,
        tags: tags.length ? tags : undefined,
      });

      return deal;
    },
    onSuccess: (deal) => {
      toast.success(t("crm.deals.created"));
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      if (deal?.id) {
        navigate(`/crm/deals/${deal.id}`);
      } else {
        navigate("/crm/deals");
      }
    },
    onError: (error) => {
      console.error("Error creating deal:", error);
      toast.error(t("crm.deals.createFailed"));
    },
  });

  const onSubmit = (values: DealFormValues) => {
    createDealMutation.mutate(values);
  };

  const closeDateValue = form.watch("expectedCloseDate");
  const parsedCloseDate = closeDateValue ? new Date(closeDateValue) : undefined;
  const closeDate =
    parsedCloseDate && !Number.isNaN(parsedCloseDate.getTime()) ? parsedCloseDate : undefined;

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/deals")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{t("crm.deals.newTitle")}</h1>
            <p className="text-muted-foreground">{t("crm.deals.newSubtitle")}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/crm/deals")}
            disabled={createDealMutation.isPending}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createDealMutation.isPending}
            data-testid="submit-deal-button"
          >
            {createDealMutation.isPending ? t("common.saving") : t("crm.deals.create")}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          data-testid="deal-form"
        >
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("crm.deals.titleLabel")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("crm.deals.titlePlaceholder")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partyId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>{t("crm.deals.customer")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("crm.deals.customerPlaceholder")}
                          list="deal-customer-options"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {customersLoading
                          ? t("crm.deals.customersLoading")
                          : t("crm.deals.customersHint")}
                      </FormDescription>
                      <FormMessage />
                      <datalist id="deal-customer-options">
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.displayName}
                          </option>
                        ))}
                      </datalist>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.deals.stage")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("crm.deals.stagePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEFAULT_PIPELINE_STAGES.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {stage.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedCloseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.deals.expectedCloseLabel")}</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !closeDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {closeDate ? (
                                closeDate.toLocaleDateString(i18n.language, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              ) : (
                                <span>{t("crm.deals.selectDate")}</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={closeDate}
                            onSelect={(date) =>
                              field.onChange(date ? date.toISOString().slice(0, 10) : "")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.deals.amount")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder={t("crm.deals.amountPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.deals.currency")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t("crm.deals.currencyPlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EUR">{t("common.currencies.eur")}</SelectItem>
                          <SelectItem value="USD">{t("common.currencies.usd")}</SelectItem>
                          <SelectItem value="GBP">{t("common.currencies.gbp")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("crm.deals.probabilityLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          placeholder={t("crm.deals.probabilityPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.notes")}</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder={t("crm.deals.notesPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.tags")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("crm.deals.tagsPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("crm.deals.pipelineTitle")}</CardTitle>
                <CardDescription>{t("crm.deals.pipelineDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEFAULT_PIPELINE_STAGES.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-muted-foreground">{stage.id}</div>
                    </div>
                    <Badge variant={stage.isClosedStage ? "outline" : "secondary"}>
                      {stage.isClosedStage ? t("common.closed") : t("common.open")}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("crm.deals.tipsTitle")}</CardTitle>
                <CardDescription>{t("crm.deals.tipsSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>{t("crm.deals.tipsOne")}</div>
                <div>{t("crm.deals.tipsTwo")}</div>
                <div>{t("crm.deals.tipsThree")}</div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
