import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@corely/ui";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@corely/ui";
import { Input } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@corely/ui";
import { useCreatePaymentMethod } from "./hooks/usePaymentMethods";
import type { BankAccountDto, PaymentMethod } from "@corely/contracts";
import { BankAccountForm } from "./BankAccountForm";

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
  onSuccess?: (paymentMethod: PaymentMethod) => void;
}

export function PaymentMethodForm({
  legalEntityId,
  bankAccounts,
  onSuccess,
}: PaymentMethodFormProps) {
  const createMutation = useCreatePaymentMethod();
  const [isCreateBankAccountOpen, setIsCreateBankAccountOpen] = React.useState(false);
  const [availableBankAccounts, setAvailableBankAccounts] = React.useState<BankAccountDto[]>(
    bankAccounts.filter((account) => account.isActive)
  );

  React.useEffect(() => {
    setAvailableBankAccounts(bankAccounts.filter((account) => account.isActive));
  }, [bankAccounts]);

  const form = useForm<PaymentMethodFormData>({
    resolver: zodResolver(PaymentMethodFormSchema),
    defaultValues: {
      type: "BANK_TRANSFER",
      label: "",
      bankAccountId:
        availableBankAccounts.find((a) => a.isDefault)?.id || availableBankAccounts[0]?.id,
      instructions: "",
      payUrl: "",
      referenceTemplate: "INV-{invoiceNumber}",
    },
  });

  const watchType = form.watch("type");

  React.useEffect(() => {
    if (watchType === "BANK_TRANSFER") {
      const currentBankAccountId = form.getValues("bankAccountId");
      if (currentBankAccountId) {
        return;
      }

      const defaultBankAccountId =
        availableBankAccounts.find((a) => a.isDefault)?.id ?? availableBankAccounts[0]?.id;
      if (defaultBankAccountId) {
        form.setValue("bankAccountId", defaultBankAccountId, { shouldValidate: true });
      }
      return;
    }

    form.setValue("bankAccountId", undefined, { shouldValidate: true });
  }, [watchType, availableBankAccounts, form]);

  const onSubmit = async (data: PaymentMethodFormData) => {
    createMutation.mutate(
      { ...data, legalEntityId },
      {
        onSuccess: (paymentMethod) => {
          form.reset();
          onSuccess?.(paymentMethod);
        },
      }
    );
  };

  return (
    <>
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
            <>
              <FormField
                control={form.control}
                name="bankAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={availableBankAccounts.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableBankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.label} ({account.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableBankAccounts.length > 0 ? (
                      <FormDescription>
                        Select a bank account for this payment method
                      </FormDescription>
                    ) : (
                      <FormDescription>
                        No active bank account found yet. Add one below and it will be selected
                        automatically.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant={availableBankAccounts.length === 0 ? "default" : "outline"}
                className="w-full"
                onClick={() => setIsCreateBankAccountOpen(true)}
              >
                Add Bank Account
              </Button>
            </>
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

      <Dialog open={isCreateBankAccountOpen} onOpenChange={setIsCreateBankAccountOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <BankAccountForm
            legalEntityId={legalEntityId}
            onSuccess={(bankAccount) => {
              setAvailableBankAccounts((current) => {
                const withoutExisting = current.filter((account) => account.id !== bankAccount.id);
                return [bankAccount, ...withoutExisting];
              });
              form.setValue("bankAccountId", bankAccount.id, { shouldValidate: true });
              setIsCreateBankAccountOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
