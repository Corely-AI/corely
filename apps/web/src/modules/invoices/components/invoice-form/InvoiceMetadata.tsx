import React from "react";
import { useTranslation } from "react-i18next";
import { useFormContext, Controller } from "react-hook-form";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/lib/utils";
import { type InvoiceFormData } from "../../schemas/invoice-form.schema";

interface InvoiceMetadataProps {
  onGenerateInvoiceNumber: () => string;
}

export function InvoiceMetadata({ onGenerateInvoiceNumber }: InvoiceMetadataProps) {
  const { t, i18n } = useTranslation();
  const {
    register,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<InvoiceFormData>();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Invoice date */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">
          {t("invoices.invoiceDate")}
        </Label>
        <Controller
          control={control}
          name="invoiceDate"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? (
                    field.value.toLocaleDateString(i18n.language)
                  ) : (
                    <span>{t("invoices.selectDate")}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={(date) => field.onChange(date || new Date())}
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      {/* Service date */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">
          {t("invoices.serviceDate")}
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {watch("serviceDateStart") && watch("serviceDateEnd") ? (
                <>
                  {watch("serviceDateStart")?.toLocaleDateString(i18n.language)} →{" "}
                  {watch("serviceDateEnd")?.toLocaleDateString(i18n.language)}
                </>
              ) : (
                <span className="text-muted-foreground">{t("invoices.selectDateRange")}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{
                from: watch("serviceDateStart"),
                to: watch("serviceDateEnd"),
              }}
              onSelect={(range) => {
                setValue("serviceDateStart", range?.from);
                setValue("serviceDateEnd", range?.to);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Invoice number */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">
          {t("invoices.invoiceNumberLabel")}
        </Label>
        <div className="flex gap-2">
          <Input
            {...register("invoiceNumber")}
            data-testid="invoice-number-input"
            className="font-medium"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setValue("invoiceNumber", onGenerateInvoiceNumber())}
          >
            {t("invoices.generate")}
          </Button>
        </div>
        {errors.invoiceNumber && (
          <p className="text-sm text-destructive">{errors.invoiceNumber.message}</p>
        )}
      </div>

      {/* Due date */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground uppercase">{t("invoices.dueDate")}</Label>
        <Controller
          control={control}
          name="dueDate"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    field.value ? "" : "text-accent"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value
                    ? field.value.toLocaleDateString(i18n.language)
                    : t("invoices.selectDate")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={(date) => field.onChange(date)}
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>
    </div>
  );
}
