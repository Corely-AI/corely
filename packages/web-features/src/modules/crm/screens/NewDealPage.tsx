import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon, Plus } from "lucide-react";
import { z } from "zod";
import { DEFAULT_PIPELINE_STAGES } from "@corely/contracts";
import { useTranslation } from "react-i18next";

import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@corely/ui";
import { Input } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@corely/ui";
import { Calendar } from "@corely/ui";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { customersApi } from "@corely/web-shared/lib/customers-api";
import { PartyPicker } from "@corely/web-shared/shared/components";
import { cn } from "@corely/web-shared/shared/lib/utils";
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
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

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

  const newCustomerFormSchema = useMemo(
    () =>
      z.object({
        displayName: z.string().min(1, t("customers.displayName")),
        email: z.string().email(t("customers.email")).optional().or(z.literal("")),
        phone: z.string().optional(),
      }),
    [t]
  );
  type NewCustomerFormValues = z.infer<typeof newCustomerFormSchema>;

  const newCustomerForm = useForm<NewCustomerFormValues>({
    resolver: zodResolver(newCustomerFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      phone: "",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (values: NewCustomerFormValues) =>
      customersApi.createCustomer({
        role: "CUSTOMER",
        kind: "INDIVIDUAL",
        displayName: values.displayName.trim(),
        email: values.email?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
      }),
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
      void queryClient.invalidateQueries({ queryKey: ["party-picker"] });
      form.setValue("partyId", customer.id, { shouldValidate: true, shouldDirty: true });
      newCustomerForm.reset();
      setIsCreateCustomerOpen(false);
      toast.success(t("customers.addNewCustomer"));
    },
    onError: (error) => {
      console.error("Error creating customer:", error);
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
                        <Input
                          placeholder={t("crm.deals.titlePlaceholder")}
                          {...field}
                          data-testid="crm-deal-title"
                        />
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
                      <FormLabel className="flex items-center justify-between gap-2">
                        <span>{t("crm.deals.customer")}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => setIsCreateCustomerOpen(true)}
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          {t("customers.addNewClient")}
                        </Button>
                      </FormLabel>
                      <FormControl>
                        <PartyPicker
                          value={field.value}
                          onValueChange={field.onChange}
                          role="CUSTOMER"
                          placeholder={t("crm.deals.customerPlaceholder")}
                          searchPlaceholder="Search customers..."
                          testId="crm-deal-party-id"
                        />
                      </FormControl>
                      <FormDescription>{t("crm.deals.customersHint")}</FormDescription>
                      <FormMessage />
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
                          <SelectTrigger data-testid="crm-deal-stage">
                            <SelectValue placeholder={t("crm.deals.stagePlaceholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DEFAULT_PIPELINE_STAGES.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              {t(`crm.deals.stages.${stage.id}`, { defaultValue: stage.name })}
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
                          data-testid="crm-deal-amount"
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
                          <SelectTrigger data-testid="crm-deal-currency">
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
                          data-testid="crm-deal-probability"
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
                      <Textarea
                        rows={4}
                        placeholder={t("crm.deals.notesPlaceholder")}
                        className="font-mono text-sm"
                        {...field}
                        data-testid="crm-deal-notes"
                      />
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
                      <div className="font-medium">
                        {t(`crm.deals.stages.${stage.id}`, { defaultValue: stage.name })}
                      </div>
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

      <Dialog open={isCreateCustomerOpen} onOpenChange={setIsCreateCustomerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("customers.addNewClient")}</DialogTitle>
            <DialogDescription>{t("customers.createDescription")}</DialogDescription>
          </DialogHeader>

          <Form {...newCustomerForm}>
            <form
              className="space-y-4"
              onSubmit={newCustomerForm.handleSubmit((values) =>
                createCustomerMutation.mutate(values)
              )}
            >
              <FormField
                control={newCustomerForm.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.displayName")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("customers.placeholders.displayName")}
                        data-testid="crm-deal-new-customer-display-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newCustomerForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        placeholder={t("customers.placeholders.email")}
                        data-testid="crm-deal-new-customer-email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={newCustomerForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("customers.phone")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t("customers.placeholders.phone")}
                        data-testid="crm-deal-new-customer-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateCustomerOpen(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" variant="accent" disabled={createCustomerMutation.isPending}>
                  {createCustomerMutation.isPending ? t("common.saving") : t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
