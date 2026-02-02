import React from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, useFieldArray, Controller } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { type InvoiceFormData } from "../../schemas/invoice-form.schema";
import { formatMoney } from "@/shared/lib/formatters";

const UNITS = ["h", "day", "piece", "service"];

interface InvoiceLineItemsProps {
  locale: string;
}

export function InvoiceLineItems({ locale }: InvoiceLineItemsProps) {
  const { t } = useTranslation();
  const {
    register,
    control,
    formState: { errors },
    watch,
  } = useFormContext<InvoiceFormData>();
  const currency = watch("currency") || t("common.currency");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">
                {t("invoices.description")}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                {t("invoices.quantity")}
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                {t("invoices.rate")}
              </th>
              <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3 w-32">
                {t("invoices.total")}
              </th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const qty = watch(`lineItems.${index}.qty`);
              const unitPriceCents = watch(`lineItems.${index}.unitPriceCents`);
              const total = qty * unitPriceCents;
              const lineItemError = errors.lineItems?.[index]?.description;

              return (
                <tr key={field.id} className="border-b border-border">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <Input
                        data-testid={`invoice-line-description-${index}`}
                        {...register(`lineItems.${index}.description` as const)}
                        placeholder="Description"
                        className="border-0 focus-visible:ring-0 px-0"
                        aria-invalid={Boolean(lineItemError)}
                      />
                      {lineItemError?.message && (
                        <p className="text-xs text-destructive">{lineItemError.message}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Input
                        data-testid={`invoice-line-qty-${index}`}
                        type="number"
                        {...register(`lineItems.${index}.qty` as const, { valueAsNumber: true })}
                        className="w-16 border-0 focus-visible:ring-0 px-0"
                        min="0"
                        step="0.01"
                      />
                      <Controller
                        control={control}
                        name={`lineItems.${index}.unit` as const}
                        render={({ field: { value, onChange } }) => (
                          <Select value={value} onValueChange={onChange}>
                            <SelectTrigger className="w-20 h-8 border-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UNITS.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <Controller
                        control={control}
                        name={`lineItems.${index}.unitPriceCents` as const}
                        render={({ field: { value, onChange } }) => (
                          <Input
                            data-testid={`invoice-line-rate-${index}`}
                            type="number"
                            value={value / 100}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onChange(Math.round(val * 100));
                            }}
                            className="border-0 focus-visible:ring-0 px-0"
                            min="0"
                            step="0.01"
                          />
                        )}
                      />
                      <span className="ml-2 text-sm text-muted-foreground">{currency}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(total, locale)}</td>
                  <td className="px-4 py-3">
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => append({ description: "", qty: 1, unit: "h", unitPriceCents: 0 })}
        data-testid="add-invoice-line"
        className="w-full border-2 border-dashed border-accent rounded-lg py-3 px-4 text-accent hover:bg-accent/5 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {t("invoices.addLine")}
      </button>
    </div>
  );
}
