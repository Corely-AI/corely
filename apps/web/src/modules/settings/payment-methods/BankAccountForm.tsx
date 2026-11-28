import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@corely/ui";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@corely/ui";
import { Input } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { useCreateBankAccount } from "./hooks/useBankAccounts";
import type { BankAccountDto } from "@corely/contracts";

const BankAccountFormSchema = z.object({
  label: z.string().min(1, "Label is required").max(255),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  iban: z.string().min(15, "Invalid IBAN").max(34),
  bic: z.string().min(8, "Invalid BIC").max(11),
  bankName: z.string().min(1, "Bank name is required"),
  currency: z.string().min(3, "Currency code is required").max(3),
  country: z.string().length(2, "Country code must be 2 characters"),
});

type BankAccountFormData = z.infer<typeof BankAccountFormSchema>;

interface BankAccountFormProps {
  legalEntityId: string;
  onSuccess?: (bankAccount: BankAccountDto) => void;
}

const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "SEK", "NOK"];
const COUNTRIES = [
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "NL", name: "Netherlands" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "BE", name: "Belgium" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
];

export function BankAccountForm({ legalEntityId, onSuccess }: BankAccountFormProps) {
  const uiCopy = useUiCopy("ui.settings-payment-methods-bankaccountform");
  const createMutation = useCreateBankAccount();

  const form = useForm<BankAccountFormData>({
    resolver: zodResolver(BankAccountFormSchema),
    defaultValues: {
      label: "",
      accountHolderName: "",
      iban: "",
      bic: "",
      bankName: "",
      currency: "EUR",
      country: "DE",
    },
  });

  const onSubmit = async (data: BankAccountFormData) => {
    createMutation.mutate(
      { ...data, legalEntityId },
      {
        onSuccess: (bankAccount) => {
          form.reset();
          onSuccess?.(bankAccount);
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

        <FormField
          control={form.control}
          name="accountHolderName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{uiCopy("account-holder-name")}</FormLabel>
              <FormControl>
                <Input placeholder={uiCopy("full-name")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="iban"
          render={({ field }) => (
            <FormItem>
              <FormLabel>IBAN</FormLabel>
              <FormControl>
                <Input placeholder={uiCopy("international-bank-account-number")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{uiCopy("bic-swift")}</FormLabel>
              <FormControl>
                <Input placeholder={uiCopy("bank-identifier-code")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bankName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{uiCopy("bank-name")}</FormLabel>
              <FormControl>
                <Input placeholder={uiCopy("e-g-deutsche-bank")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{uiCopy("currency")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CURRENCIES.map((curr) => (
                      <SelectItem key={curr} value={curr}>
                        {curr}
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
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{uiCopy("country")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={createMutation.isPending} className="w-full">
          {createMutation.isPending ? uiCopy("creating") : uiCopy("create-account")}
        </Button>
      </form>
    </Form>
  );
}
