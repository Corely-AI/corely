import React from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, Controller } from "react-hook-form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { type InvoiceFormData } from "../../schemas/invoice-form.schema";
import { formatMoney } from "@/shared/lib/formatters";

const AVAILABLE_VAT_RATES = [0, 7, 19];

interface InvoiceTotalsProps {
  locale: string;
}

export function InvoiceTotals({ locale }: InvoiceTotalsProps) {
  const { t } = useTranslation();
  const { watch, control } = useFormContext<InvoiceFormData>();

  const lineItems = watch("lineItems") || [];
  const vatRate = watch("vatRate") || 0;

  const subtotalCents = lineItems.reduce(
    (sum, item) => sum + (item.qty || 0) * (item.unitPriceCents || 0),
    0
  );
  const vatCents = Math.round(subtotalCents * (vatRate / 100));
  const totalCents = subtotalCents + vatCents;

  return (
    <div className="space-y-3 pt-6 border-t border-border">
      <div className="flex justify-between items-center pb-3">
        <span className="text-sm font-medium">{t("invoices.totalAmountNet")}</span>
        <span className="text-lg font-semibold">{formatMoney(subtotalCents, locale)}</span>
      </div>

      <div className="flex justify-between items-center pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{t("invoices.vatAmount")}</span>
          <Controller
            control={control}
            name="vatRate"
            render={({ field: { value, onChange } }) => (
              <Select value={String(value)} onValueChange={(val) => onChange(parseInt(val))}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_VAT_RATES.map((rate) => (
                    <SelectItem key={rate} value={String(rate)}>
                      {rate}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <span className="text-lg font-semibold">{formatMoney(vatCents, locale)}</span>
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-border">
        <span className="text-base font-semibold">{t("invoices.totalAmountGross")}</span>
        <span className="text-xl font-bold">{formatMoney(totalCents, locale)}</span>
      </div>
    </div>
  );
}
