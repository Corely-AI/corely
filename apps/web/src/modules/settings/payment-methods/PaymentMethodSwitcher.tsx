import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Edit2, Plus, Printer, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { paymentMethodsApi } from "@/lib/payment-methods-api";
import { cn } from "@/shared/lib/utils";
import type { PaymentMethod } from "@corely/contracts";

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
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["payment-methods", legalEntityId],
    queryFn: () => paymentMethodsApi.listPaymentMethods(legalEntityId),
    enabled: !!legalEntityId,
  });

  const methods = data?.paymentMethods ?? [];
  const selectedMethod =
    methods.find((m) => m.id === selectedId) ||
    methods.find((m) => m.isDefaultForInvoicing) ||
    methods[0];

  // Auto-select default if none selected
  React.useEffect(() => {
    if (!selectedId && selectedMethod) {
      onSelect(selectedMethod.id);
    }
  }, [selectedId, selectedMethod, onSelect]);

  if (isLoading) {
    return <div className="h-10 w-48 animate-pulse bg-muted rounded-md" />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="w-full h-full border border-border rounded-lg py-3 px-4 text-left hover:bg-muted/30 transition-colors"
        >
          {selectedMethod ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground min-w-[70px]">Bank:</span>
                <span className="text-foreground font-medium">{selectedMethod.label}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground min-w-[70px]">IBAN:</span>
                <span className="text-foreground">
                  {selectedMethod.bankAccountId ? "Selected Bank Account" : "N/A"}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">Select payment method</div>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Select your payment method</DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-3">
          {methods.map((method) => (
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
                </span>
              </div>

              <div className="flex items-center gap-3">
                {method.isDefaultForInvoicing && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50 text-[10px] h-5 px-1.5 uppercase font-bold tracking-tighter"
                  >
                    Default
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
          ))}

          <Button
            variant="outline"
            className="w-full mt-2 rounded-xl border-dashed border-2 py-6 gap-2 text-accent border-accent/30 hover:border-accent/50 hover:bg-accent/5"
            onClick={() => {
              // Navigate to settings or open another dialog?
              // For now just close
              setIsOpen(false);
            }}
          >
            <Plus className="h-4 w-4" />
            Add new payment method
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
