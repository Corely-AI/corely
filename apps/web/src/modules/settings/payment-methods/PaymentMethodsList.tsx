import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { Plus, Trash2, Check, CreditCard, Banknote, DollarSign } from "lucide-react";
import { LoadingSkeleton, Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@corely/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@corely/ui";
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useSetPaymentMethodDefault,
  useDeactivatePaymentMethod,
} from "./hooks/usePaymentMethods";
import { useBankAccounts } from "./hooks/useBankAccounts";
import { PaymentMethodForm } from "./PaymentMethodForm";
import type { PaymentMethod } from "@corely/contracts";

interface PaymentMethodsListProps {
  legalEntityId: string;
}

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  BANK_TRANSFER: <Banknote className="w-4 h-4" />,
  PAYPAL: <DollarSign className="w-4 h-4" />,
  CASH: <DollarSign className="w-4 h-4" />,
  CARD: <CreditCard className="w-4 h-4" />,
  OTHER: <DollarSign className="w-4 h-4" />,
};

export function PaymentMethodsList({ legalEntityId }: PaymentMethodsListProps) {
  const uiCopy = useUiCopy("ui.settings-payment-methods-paymentmethodslist");
  const { data, isLoading } = usePaymentMethods(legalEntityId);
  const { data: accountsData } = useBankAccounts(legalEntityId);
  const methods = data?.paymentMethods ?? [];
  const bankAccounts = accountsData?.bankAccounts ?? [];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const createMutation = useCreatePaymentMethod();
  const setDefaultMutation = useSetPaymentMethodDefault();
  const deactivateMutation = useDeactivatePaymentMethod();

  const activeMethods = methods.filter((m) => m.isActive);

  if (isLoading) {
    return <LoadingSkeleton variant="list" label={uiCopy("loading-payment-methods")} />;
  }

  const getBankAccountLabel = (bankAccountId: string | null | undefined) => {
    if (!bankAccountId) {
      return null;
    }
    const account = bankAccounts.find((a) => a.id === bankAccountId);
    return account?.label || "Unknown Account";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{uiCopy("payment-methods")}</h3>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              {uiCopy("add-method")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{uiCopy("add-payment-method")}</DialogTitle>
            </DialogHeader>
            <PaymentMethodForm
              legalEntityId={legalEntityId}
              bankAccounts={bankAccounts}
              onSuccess={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {activeMethods.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {uiCopy("no-payment-methods-configured")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeMethods.map((method) => (
            <Card key={method.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1 flex items-start gap-3">
                  <div className="pt-1">{PAYMENT_ICONS[method.type]}</div>
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">{method.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {method.type}
                      {method.type === "BANK_TRANSFER" &&
                        ` • ${getBankAccountLabel(method.bankAccountId)}`}
                    </div>
                    {method.referenceTemplate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {uiCopy("reference") + " "}
                        {method.referenceTemplate}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {method.isDefaultForInvoicing && (
                    <Badge variant="secondary" className="gap-1">
                      <Check className="w-3 h-3" />
                      {uiCopy("default")}
                    </Badge>
                  )}

                  {!method.isDefaultForInvoicing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultMutation.mutate({ id: method.id, legalEntityId })}
                      disabled={setDefaultMutation.isPending}
                    >
                      {uiCopy("set-default")}
                    </Button>
                  )}

                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(method.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>{uiCopy("deactivate-payment-method")}</AlertDialogTitle>
          <AlertDialogDescription>{uiCopy("this-payment-method-will")}</AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>{uiCopy("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deactivateMutation.mutate({ id: deleteId, legalEntityId });
                  setDeleteId(null);
                }
              }}
              disabled={deactivateMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {uiCopy("deactivate")}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
