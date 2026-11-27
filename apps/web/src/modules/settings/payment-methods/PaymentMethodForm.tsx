import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
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
  const uiCopy = useUiCopy("ui.settings-payment-methods-paymentmethodform");
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
                <FormLabel>{uiCopy("payment-type")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">{uiCopy("bank-transfer")}</SelectItem>
                    <SelectItem value="PAYPAL">PayPal</SelectItem>
                    <SelectItem value="CASH">{uiCopy("cash")}</SelectItem>
                    <SelectItem value="CARD">{uiCopy("card-payment")}</SelectItem>
                    <SelectItem value="OTHER">{uiCopy("other")}</SelectItem>
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
                <FormLabel>{uiCopy("label")}</FormLabel>
                <FormControl>
                  <Input placeholder={uiCopy("e-g-main-account")} {...field} />
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
                    <FormLabel>{uiCopy("bank-account")}</FormLabel>
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
                      <FormDescription>{uiCopy("select-a-bank-account")}</FormDescription>
                    ) : (
                      <FormDescription>{uiCopy("no-active-bank-account")}</FormDescription>
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
                {uiCopy("add-bank-account")}
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
                    <FormLabel>{uiCopy("payment-instructions")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={uiCopy("enter-payment-instructions")}
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      {uiCopy("instructions-displayed-on-invoices")}
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
                    <FormLabel>{uiCopy("payment-url-optional")}</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://..." {...field} />
                    </FormControl>
                    <FormDescription>{uiCopy("link-to-payment-gateway")}</FormDescription>
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
                <FormLabel>{uiCopy("reference-template")}</FormLabel>
                <FormControl>
                  <Input placeholder={uiCopy("inv-invoicenumber")} {...field} />
                </FormControl>
                <FormDescription>
                  {uiCopy("use") + " "}
                  {`{invoiceNumber}`}
                  {" " + uiCopy("as-placeholder-for-invoice")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? uiCopy("creating") : uiCopy("create-payment-method")}
          </Button>
        </form>
      </Form>

      <Dialog open={isCreateBankAccountOpen} onOpenChange={setIsCreateBankAccountOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{uiCopy("add-bank-account")}</DialogTitle>
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
