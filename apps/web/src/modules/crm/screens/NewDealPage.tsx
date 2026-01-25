import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { z } from "zod";
import { DEFAULT_PIPELINE_STAGES } from "@corely/contracts";
import { format } from "date-fns";

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

const dealFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  partyId: z.string().min(1, "Customer is required"),
  stageId: z.string().min(1, "Stage is required"),
  amount: z
    .string()
    .optional()
    .refine((val) => !val || !Number.isNaN(Number(val)), "Amount must be a number"),
  currency: z.string().min(1, "Currency is required"),
  expectedCloseDate: z.string().optional(),
  probability: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!Number.isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
      "Probability must be between 0 and 100"
    ),
  notes: z.string().optional(),
  tags: z.string().optional(),
});

type DealFormValues = z.infer<typeof dealFormSchema>;

export default function NewDealPage() {
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
      toast.success("Deal created");
      void queryClient.invalidateQueries({ queryKey: ["deals"] });
      if (deal?.id) {
        navigate(`/crm/deals/${deal.id}`);
      } else {
        navigate("/crm/deals");
      }
    },
    onError: (error) => {
      console.error("Error creating deal:", error);
      toast.error("Failed to create deal. Please try again.");
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
            <h1 className="text-h1 text-foreground">New Deal</h1>
            <p className="text-muted-foreground">Create a new opportunity in your pipeline.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/crm/deals")}
            disabled={createDealMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createDealMutation.isPending}
            data-testid="submit-deal-button"
          >
            {createDealMutation.isPending ? "Saving..." : "Create Deal"}
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
                      <FormLabel>Deal title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Implementation for Acme Corp" {...field} />
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
                      <FormLabel>Customer / Party</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Select a customer or paste a party ID"
                          list="deal-customer-options"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        {customersLoading
                          ? "Loading customers..."
                          : "Start typing to find an existing customer."}
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
                      <FormLabel>Stage</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
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
                      <FormLabel>Expected close date</FormLabel>
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
                              {closeDate ? format(closeDate, "PPP") : <span>Select a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={closeDate}
                            onSelect={(date) =>
                              field.onChange(date ? format(date, "yyyy-MM-dd") : "")
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
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
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
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
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
                      <FormLabel>Probability (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          placeholder="50"
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
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Context, next steps, stakeholders..."
                        {...field}
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
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Comma separated tags (e.g. enterprise, pilot)"
                        {...field}
                      />
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
                <CardTitle>Pipeline</CardTitle>
                <CardDescription>Stages used to track progress.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEFAULT_PIPELINE_STAGES.map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{stage.name}</div>
                      <div className="text-muted-foreground">{stage.id}</div>
                    </div>
                    <Badge variant={stage.isClosedStage ? "outline" : "secondary"}>
                      {stage.isClosedStage ? "Closed" : "Open"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
                <CardDescription>Keep deals actionable and owned.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>Use clear titles that state the problem and offer.</div>
                <div>Set a close date and probability to improve forecasting.</div>
                <div>Tag deals so you can filter them later.</div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
