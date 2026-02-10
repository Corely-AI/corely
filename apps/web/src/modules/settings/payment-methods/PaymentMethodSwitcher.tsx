import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Edit2, Plus, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { paymentMethodsApi } from "@/lib/payment-methods-api";
import { cn } from "@/shared/lib/utils";
import type { ListPaymentMethodsOutput, PaymentMethod } from "@corely/contracts";
import { useTranslation } from "react-i18next";
import { useBankAccounts } from "./hooks/useBankAccounts";
import { PaymentMethodForm } from "./PaymentMethodForm";

interface PaymentMethodSwitcherProps {
  legalEntityId: string;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function PaymentMethodSwitcher({
  legalEntityId,
  selectedId,
  onSelect,
}: PaymentMethodSwitcherProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["payment-methods", legalEntityId],
    queryFn: () => paymentMethodsApi.listPaymentMethods(legalEntityId),
    enabled: !!legalEntityId,
  });
  const { data: bankAccountsData } = useBankAccounts(legalEntityId, { includeSensitive: true });
  const bankAccounts = (bankAccountsData?.bankAccounts ?? []).filter((account) => account.isActive);

  const methods = data?.paymentMethods ?? [];
  const selectedMethod =
    methods.find((m) => m.id === selectedId) ||
    methods.find((m) => m.isDefaultForInvoicing) ||
    methods[0];
  const selectedBankAccount = selectedMethod?.bankAccountId
    ? bankAccounts.find((account) => account.id === selectedMethod.bankAccountId)
    : undefined;

  // Auto-select default if none selected
  React.useEffect(() => {
    if (!selectedId && selectedMethod) {
      onSelect(selectedMethod.id);
    }
  }, [selectedId, selectedMethod, onSelect]);

  if (isLoading) {
    return <div className="h-10 w-48 animate-pulse bg-muted rounded-md" />;
  }

  const handlePaymentMethodCreated = (paymentMethod: PaymentMethod) => {
    queryClient.setQueryData<ListPaymentMethodsOutput>(
      ["payment-methods", legalEntityId],
      (current) => {
        if (!current) {
          return { paymentMethods: [paymentMethod] };
        }

        return {
          ...current,
          paymentMethods: [
            paymentMethod,
            ...current.paymentMethods.filter((method) => method.id !== paymentMethod.id),
          ],
        };
      }
    );

    onSelect(paymentMethod.id);
    setIsCreateOpen(false);
    setIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="w-full h-full border border-border rounded-lg py-3 px-4 text-left hover:bg-muted/30 transition-colors"
          >
            {selectedMethod ? (
              <div className="space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <span className="text-muted-foreground min-w-[95px]">Method:</span>
                  <span className="text-foreground font-medium">{selectedMethod.label}</span>
                </div>
                {selectedMethod.type === "BANK_TRANSFER" ? (
                  <>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[95px]">Account:</span>
                      <span className="text-foreground">
                        {selectedBankAccount?.accountHolderName ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[95px]">
                        {t("common.iban")}:
                      </span>
                      <span className="text-foreground font-mono">
                        {selectedBankAccount?.iban ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[95px]">BIC:</span>
                      <span className="text-foreground font-mono">
                        {selectedBankAccount?.bic ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[95px]">
                        {t("common.bank")}:
                      </span>
                      <span className="text-foreground">
                        {selectedBankAccount?.bankName ?? selectedBankAccount?.label ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[95px]">Reference:</span>
                      <span className="text-foreground font-mono">
                        {selectedMethod.referenceTemplate ?? "N/A"}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[95px]">Type:</span>
                      <span className="text-foreground">{selectedMethod.type}</span>
                    </div>
                    {selectedMethod.instructions && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground min-w-[95px]">Instructions:</span>
                        <span className="text-foreground">{selectedMethod.instructions}</span>
                      </div>
                    )}
                    {selectedMethod.payUrl && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground min-w-[95px]">Pay link:</span>
                        <a
                          href={selectedMethod.payUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent hover:underline truncate"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {selectedMethod.payUrl}
                        </a>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">
                {t("invoices.footer.selectPaymentMethod")}
              </div>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              {t("invoices.footer.selectPaymentMethodTitle")}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {methods.map((method) => {
              const methodBankAccount = method.bankAccountId
                ? bankAccounts.find((account) => account.id === method.bankAccountId)
                : undefined;

              return (
                <div
                  key={method.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer hover:border-accent/50",
                    selectedId === method.id
                      ? "border-accent bg-accent/5 shadow-sm"
                      : "border-transparent bg-muted/30"
                  )}
                  onClick={() => {
                    onSelect(method.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{method.label}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">
                      {method.type}
                      {methodBankAccount?.iban ? ` • ${methodBankAccount.iban}` : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {method.isDefaultForInvoicing && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50 text-[10px] h-5 px-1.5 uppercase font-bold tracking-tighter"
                      >
                        {t("common.default")}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {selectedId === method.id && (
                      <div className="bg-accent text-accent-foreground rounded-full p-1 ml-2">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            <Button
              variant="outline"
              className="w-full mt-2 rounded-xl border-dashed border-2 py-6 gap-2 text-accent border-accent/30 hover:border-accent/50 hover:bg-accent/5"
              onClick={() => {
                setIsOpen(false);
                setIsCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {t("invoices.footer.addNewPaymentMethod")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{t("invoices.footer.addNewPaymentMethod")}</DialogTitle>
          </DialogHeader>
          <PaymentMethodForm
            legalEntityId={legalEntityId}
            bankAccounts={bankAccounts}
            onSuccess={handlePaymentMethodCreated}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
