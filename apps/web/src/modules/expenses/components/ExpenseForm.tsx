import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

const expenseFormSchema = z.object({
  merchantName: z.string().min(1, "Merchant is required"),
  expenseDate: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("EUR"),
  category: z.string().optional(),
  vatRate: z.string().optional(),
  notes: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const CATEGORY_OPTIONS = [
  "office_supplies",
  "software",
  "travel",
  "meals",
  "home_office",
  "education",
  "hardware",
  "phone_internet",
  "other",
] as const;

const VAT_OPTIONS = ["0", "7", "19"];

type ExpenseFormProps = {
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseFormValues) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = "Save",
}) => {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      merchantName: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      amount: "",
      currency: "EUR",
      category: undefined,
      vatRate: "19",
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <form
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      onSubmit={form.handleSubmit(onSubmit)}
      data-testid="expense-form"
    >
      <Card className="lg:col-span-2">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="expense-category"
                {...form.register("category")}
                defaultValue={form.getValues("category") ?? ""}
              >
                <option value="">Select</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchantName">Merchant</Label>
              <Input
                id="merchantName"
                placeholder="e.g. Internet subscription"
                {...form.register("merchantName")}
                data-testid="expense-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input type="date" id="expenseDate" {...form.register("expenseDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...form.register("amount")}
                  data-testid="expense-amount"
                />
                <Select
                  value={form.watch("currency")}
                  onValueChange={(value) => form.setValue("currency", value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>VAT</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.watch("vatRate")}
                onChange={(event) => form.setValue("vatRate", event.target.value)}
              >
                {VAT_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} placeholder="Notes" {...form.register("notes")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-sm text-muted-foreground">Receipt (optional)</div>
            <div className="border border-dashed border-border rounded-md p-4 text-center text-sm text-muted-foreground">
              Attach receipts after saving this expense.
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button
            variant="accent"
            type="submit"
            data-testid="expense-submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
};
