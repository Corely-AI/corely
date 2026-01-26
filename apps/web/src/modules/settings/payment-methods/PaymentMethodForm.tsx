import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useCreatePaymentMethod } from "./hooks/usePaymentMethods";
import type { BankAccountDto } from "@corely/contracts";

const PaymentMethodFormSchema = z
  .object({
    type: z.enum(["BANK_TRANSFER", "PAYPAL", "CASH", "CARD", "OTHER"]),
    label: z.string().min(1, "Label is required").max(255),
    bankAccountId: z.string().optional(),
    instructions: z.string().max(1000).optional(),
    payUrl: z.string().url().optional().or(z.literal("")),
    referenceTemplate: z.string().max(500).default("INV-{invoiceNumber}"),
  })
  .refine(
    (data) => {
      if (data.type === "BANK_TRANSFER" && !data.bankAccountId) {
        return false;
      }
      return true;
    },
    { message: "Bank account is required for bank transfers", path: ["bankAccountId"] }
  );

type PaymentMethodFormData = z.infer<typeof PaymentMethodFormSchema>;

interface PaymentMethodFormProps {
  legalEntityId: string;
  bankAccounts: BankAccountDto[];
  onSuccess?: () => void;
}

export function PaymentMethodForm({
  legalEntityId,
  bankAccounts,
  onSuccess,
}: PaymentMethodFormProps) {
  const createMutation = useCreatePaymentMethod();

  const form = useForm<PaymentMethodFormData>({
    resolver: zodResolver(PaymentMethodFormSchema),
    defaultValues: {
      type: "BANK_TRANSFER",
      label: "",
      bankAccountId: bankAccounts.find((a) => a.isDefault)?.id || bankAccounts[0]?.id,
      instructions: "",
      payUrl: "",
      referenceTemplate: "INV-{invoiceNumber}",
    },
  });

  const watchType = form.watch("type");

  const onSubmit = async (data: PaymentMethodFormData) => {
    createMutation.mutate(
      { ...data, legalEntityId },
      {
        onSuccess: () => {
          form.reset();
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="CARD">Card Payment</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Main Account" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchType === "BANK_TRANSFER" && (
          <FormField
            control={form.control}
            name="bankAccountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bank Account</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label} ({account.currency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Select a bank account for this payment method</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {watchType !== "BANK_TRANSFER" && (
          <>
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Instructions</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter payment instructions..." {...field} rows={3} />
                  </FormControl>
                  <FormDescription>
                    Instructions displayed on invoices for this payment method
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment URL (Optional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://..." {...field} />
                  </FormControl>
                  <FormDescription>Link to payment gateway or payment page</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <FormField
          control={form.control}
          name="referenceTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference Template</FormLabel>
              <FormControl>
                <Input placeholder="INV-{invoiceNumber}" {...field} />
              </FormControl>
              <FormDescription>
                Use {`{invoiceNumber}`} as placeholder for invoice number
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createMutation.isPending} className="w-full">
          {createMutation.isPending ? "Creating..." : "Create Payment Method"}
        </Button>
      </form>
    </Form>
  );
}
