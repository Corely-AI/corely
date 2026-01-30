import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TaxFilingTypeSchema, TaxPeriodKeySchema } from "@corely/contracts";
import { taxApi } from "@/lib/tax-api";
import { Button } from "@/shared/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useToast } from "@/shared/ui/use-toast";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

// Schema for the form
const formSchema = z
  .object({
    type: TaxFilingTypeSchema,
    year: z.coerce.number().int().optional(),
    periodKey: z.preprocess((value) => {
      if (typeof value !== "string") {
        return value;
      }
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }, TaxPeriodKeySchema.optional()), // Required if VAT
    entityId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "vat" && !data.periodKey) {
        return false;
      }
      if (data.type !== "vat" && !data.year) {
        return false;
      }
      return true;
    },
    {
      message: "Period is required for VAT filings",
      path: ["periodKey"],
    }
  )
  .refine((data) => (data.type !== "vat" ? !!data.year : true), {
    message: "Year is required for annual filings",
    path: ["year"],
  });

type FormValues = z.infer<typeof formSchema>;

export const CreateFilingPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeWorkspace } = useWorkspace();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: (searchParams.get("type") as any) || "vat",
      year: Number(searchParams.get("year")) || new Date().getFullYear(),
      periodKey: searchParams.get("periodKey") || "",
      entityId: searchParams.get("entityId") || activeWorkspace?.legalEntityId || "",
    },
  });

  const type = form.watch("type");

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        ...values,
        periodKey: values.periodKey?.trim() || undefined,
      };
      const result = await taxApi.createFiling(payload);
      toast({
        title: "Filing created",
        description: "Redirecting to filing details...",
      });
      navigate(`/tax/filings/${result.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error creating filing",
        description: error.message || "Something went wrong",
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">New Tax Filing</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create Filing</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filing Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vat">VAT Return</SelectItem>
                        <SelectItem value="income-annual">Income Tax (Annual)</SelectItem>
                        <SelectItem value="vat-annual">Annual VAT</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {type === "vat" && (
                <FormField
                  control={form.control}
                  name="periodKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period (Quarter/Month)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 2025-Q1" {...field} />
                      </FormControl>
                      <div className="text-xs text-muted-foreground">
                        Format: YYYY-Qx (e.g. 2025-Q1) or YYYY-MM (e.g. 2025-01)
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="pt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit">Create Filing</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
