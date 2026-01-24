import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Label } from "@/shared/ui/label";
import { PaymentMethodSwitcher, ContactDetailsDialog, TaxDetailsDialog } from "@/modules/settings";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { useNavigate } from "react-router-dom";

interface InvoiceFooterProps {
  paymentMethodId?: string;
  onPaymentMethodSelect: (id: string) => void;
}

export function InvoiceFooter({ paymentMethodId, onPaymentMethodSelect }: InvoiceFooterProps) {
  const { activeWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  return (
    <>
      {/* Tax Details Dialog */}
      <TaxDetailsDialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen} />

      {/* Contact Details Dialog */}
      <ContactDetailsDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />

      {/* Footer: Payment Information */}
      <div className="pt-6 border-t border-border">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tax Number */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tax Number</Label>
            {activeWorkspace?.taxId || activeWorkspace?.vatId ? (
              <button
                type="button"
                onClick={() => setTaxDialogOpen(true)}
                className="flex-1 min-h-[80px] border border-border rounded-lg py-3 px-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1.5 text-sm">
                  {activeWorkspace?.vatId && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[90px]">VAT-ID:</span>
                      <span className="font-mono text-foreground">{activeWorkspace.vatId}</span>
                    </div>
                  )}
                  {activeWorkspace?.taxId && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[90px]">Tax Number:</span>
                      <span className="font-mono text-foreground">{activeWorkspace.taxId}</span>
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setTaxDialogOpen(true)}
                className="flex-1 min-h-[80px] border-2 border-dashed border-accent rounded-lg py-2 px-3 text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add tax details
              </button>
            )}
          </div>

          {/* Payment Method */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Payment Method</Label>
            {activeWorkspace?.legalEntityId ? (
              <div className="flex-1 min-h-[80px]">
                <PaymentMethodSwitcher
                  legalEntityId={activeWorkspace.legalEntityId}
                  selectedId={paymentMethodId}
                  onSelect={onPaymentMethodSelect}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/settings/payment-methods")}
                className="flex-1 min-h-[80px] border-2 border-dashed border-accent rounded-lg py-2 px-3 text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add payment method
              </button>
            )}
          </div>

          {/* Contact Details */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contact Details</Label>
            {activeWorkspace?.phone || activeWorkspace?.email || activeWorkspace?.website ? (
              <button
                type="button"
                onClick={() => setContactDialogOpen(true)}
                className="flex-1 min-h-[80px] border border-border rounded-lg py-3 px-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="space-y-1.5 text-sm">
                  {activeWorkspace?.phone && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[70px]">Tel.:</span>
                      <span className="text-foreground">{activeWorkspace.phone}</span>
                    </div>
                  )}
                  {activeWorkspace?.email && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[70px]">E-Mail:</span>
                      <span className="text-foreground">{activeWorkspace.email}</span>
                    </div>
                  )}
                  {activeWorkspace?.website && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-[70px]">Website:</span>
                      <span className="text-foreground">{activeWorkspace.website.replace(/^https?:\/\//, '')}</span>
                    </div>
                  )}
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setContactDialogOpen(true)}
                className="flex-1 min-h-[80px] border-2 border-dashed border-accent rounded-lg py-2 px-3 text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add contact details
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
