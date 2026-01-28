import React from "react";
import { useTranslation } from "react-i18next";
import { useFormContext } from "react-hook-form";
import { Label } from "@/shared/ui/label";
import { type InvoiceFormData } from "../../schemas/invoice-form.schema";

export function InvoiceNotes() {
  const { t } = useTranslation();
  const { register } = useFormContext<InvoiceFormData>();

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("invoices.notes")}</Label>
        <textarea
          {...register("notes")}
          className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t("invoices.notesPlaceholder")}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t("invoices.terms")}</Label>
        <textarea
          {...register("terms")}
          className="w-full min-h-[100px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          placeholder={t("invoices.termsPlaceholder")}
        />
      </div>
    </div>
  );
}
