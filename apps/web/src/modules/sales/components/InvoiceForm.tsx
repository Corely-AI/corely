import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect, useMemo, useState } from "react";
import type { SalesInvoiceDto, PaymentMethodConfig } from "@corely/contracts";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { formatMoney } from "@/shared/lib/formatters";

export type InvoiceFormValues = {
  customerPartyId: string;
  currency: string;
  issueDate?: string;
  dueDate?: string;
  paymentTerms?: string;
  notes?: string;
  paymentMethodId?: string;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    discountCents?: number;
  }>;
};

type InvoiceFormProps = {
  customers: Array<{ id: string; displayName: string }>;
  paymentMethods?: PaymentMethodConfig[];
  initial?: SalesInvoiceDto;
  disabled?: boolean;
  onSubmit: (values: InvoiceFormValues) => void;
};

type LineItem = {
  id?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
};

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  customers,
  paymentMethods = [],
  initial,
  disabled,
  onSubmit,
}) => {
  const uiCopy = useUiCopy("ui.sales-invoiceform");
  const [customerPartyId, setCustomerPartyId] = useState(initial?.customerPartyId ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "EUR");
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? "");
  const [paymentTerms, setPaymentTerms] = useState(initial?.paymentTerms ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(initial?.paymentMethodId ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.lineItems?.length
      ? initial.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents ?? 0,
        }))
      : [{ description: "", quantity: 1, unitPriceCents: 0, discountCents: 0 }]
  );

  useEffect(() => {
    if (initial) {
      setCustomerPartyId(initial.customerPartyId);
      setCurrency(initial.currency);
      setIssueDate(initial.issueDate ?? "");
      setDueDate(initial.dueDate ?? "");
      setPaymentTerms(initial.paymentTerms ?? "");
      setNotes(initial.notes ?? "");
      setPaymentMethodId(initial.paymentMethodId ?? "");
      setLineItems(
        initial.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents ?? 0,
        }))
      );
    }
  }, [initial]);

  const totals = useMemo(() => {
    const subtotalCents = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPriceCents,
      0
    );
    const discountCents = lineItems.reduce((sum, item) => sum + (item.discountCents ?? 0), 0);
    const totalCents = Math.max(subtotalCents - discountCents, 0);
    return { subtotalCents, discountCents, totalCents };
  }, [lineItems]);

  const updateLineItem = (
    index: number,
    field: keyof InvoiceFormValues["lineItems"][number],
    value: string
  ) => {
    setLineItems((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      if (field === "quantity" || field === "unitPriceCents" || field === "discountCents") {
        current[field] = Number(value) || 0;
      } else {
        current[field] = value as any;
      }
      next[index] = current;
      return next;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPriceCents: 0, discountCents: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({
      customerPartyId,
      currency,
      issueDate: issueDate || undefined,
      dueDate: dueDate || undefined,
      paymentTerms: paymentTerms || undefined,
      notes: notes || undefined,
      paymentMethodId: paymentMethodId || undefined,
      lineItems,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{uiCopy("customer")}</Label>
          <Select value={customerPartyId} onValueChange={setCustomerPartyId} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder={uiCopy("select-customer")} />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{uiCopy("currency")}</Label>
          <Input
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>{uiCopy("issue-date")}</Label>
          <Input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label>{uiCopy("due-date")}</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>{uiCopy("payment-terms")}</Label>
          <Input
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>{uiCopy("payment-method-optional")}</Label>
          <Select value={paymentMethodId} onValueChange={setPaymentMethodId} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder={uiCopy("select-payment-method")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{uiCopy("none")}</SelectItem>
              {paymentMethods
                .filter((m) => m.isActive)
                .map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.label} ({method.type})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{uiCopy("line-items")}</Label>
          <Button type="button" variant="secondary" onClick={addLineItem} disabled={disabled}>
            {uiCopy("add-line")}
          </Button>
        </div>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-6 items-end">
              <div className="md:col-span-2">
                <Label>{uiCopy("description")}</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(index, "description", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>{uiCopy("qty")}</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>{uiCopy("unit-price-cents")}</Label>
                <Input
                  type="number"
                  value={item.unitPriceCents}
                  onChange={(e) => updateLineItem(index, "unitPriceCents", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label>{uiCopy("discount-cents")}</Label>
                <Input
                  type="number"
                  value={item.discountCents ?? 0}
                  onChange={(e) => updateLineItem(index, "discountCents", e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeLineItem(index)}
                  disabled={disabled}
                >
                  {uiCopy("remove")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{uiCopy("notes")}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={disabled} />
      </div>

      <div className="border-t pt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {uiCopy("subtotal") + " "}
          {formatMoney(totals.subtotalCents, "en-US", currency)}
          {" " + uiCopy("discount")} {formatMoney(totals.discountCents, "en-US", currency)}
        </div>
        <div className="text-lg font-semibold">
          {uiCopy("total") + " "}
          {formatMoney(totals.totalCents, "en-US", currency)}
        </div>
      </div>

      <Button type="submit" variant="accent" disabled={disabled || !customerPartyId}>
        {uiCopy("save-invoice")}
      </Button>
    </form>
  );
};
