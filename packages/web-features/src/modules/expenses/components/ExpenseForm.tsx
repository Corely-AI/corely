import React from "react";
import { FileText, Paperclip, X, AlertTriangle, Info } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Textarea } from "@corely/ui";
import {
  CATEGORY_REQUIREMENTS,
  DE_EXPENSE_CATEGORIES,
  expenseFormSchema,
  isSupportedReceipt,
  MAX_RECEIPT_SIZE_BYTES,
  previewDeductibility,
  type ExpenseFormValues,
  VAT_OPTIONS,
} from "./expense-form.config";
export type { ExpenseFormValues } from "./expense-form.config";

type ExpenseFormProps = {
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseFormValues, extras: { receiptFiles: File[] }) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel,
}) => {
  const { t } = useTranslation();
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      merchantName: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      amount: "",
      currency: "EUR",
      category: undefined,
      vatRate: "19",
      notes: "",
      ...defaultValues,
    },
  });
  const [receiptFiles, setReceiptFiles] = React.useState<File[]>([]);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);

  // Watch relevant fields for dynamic sections
  const category = useWatch({ control: form.control, name: "category" });
  const amount = useWatch({ control: form.control, name: "amount" });
  const businessUsePercent = useWatch({ control: form.control, name: "businessUsePercent" });

  const req = CATEGORY_REQUIREMENTS[category ?? ""] ?? {};
  const preview = previewDeductibility(category, amount, businessUsePercent);
  const previewLabel = t(preview.labelKey, preview.labelValues ?? {});

  const handleReceiptSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) {
      return;
    }
    const validFiles: File[] = [];
    let firstError: string | null = null;

    for (const file of selected) {
      if (!isSupportedReceipt(file)) {
        firstError ??= t("expenses.form.receiptErrors.unsupportedType", { name: file.name });
        continue;
      }
      if (file.size > MAX_RECEIPT_SIZE_BYTES) {
        firstError ??= t("expenses.form.receiptErrors.fileTooLarge", { name: file.name });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setReceiptFiles((current) => {
        const existing = new Set(
          current.map((file) => `${file.name}:${file.size}:${file.lastModified}`)
        );
        const incoming = validFiles.filter(
          (file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`)
        );
        return [...current, ...incoming];
      });
    }
    setReceiptError(firstError);
    event.target.value = "";
  };

  const removeReceiptFile = (index: number) => {
    setReceiptFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setReceiptError(null);
  };

  return (
    <form
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      onSubmit={form.handleSubmit((values) => onSubmit(values, { receiptFiles }))}
      data-testid="expense-form"
    >
      <div className="lg:col-span-2 space-y-6">
        {/* Main Details Card */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t("expenses.category")}</Label>
                <select
                  id="category"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  data-testid="expense-category"
                  {...form.register("category")}
                  defaultValue={form.getValues("category") ?? ""}
                >
                  <option value="">{t("expenses.form.selectCategory")}</option>
                  {DE_EXPENSE_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="merchantName">{t("expenses.merchant")}</Label>
                <Input
                  id="merchantName"
                  placeholder={t("expenses.form.merchantPlaceholder")}
                  {...form.register("merchantName")}
                  data-testid="expense-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseDate">{t("expenses.date")}</Label>
                <Input type="date" id="expenseDate" {...form.register("expenseDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t("expenses.amount")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...form.register("amount")}
                    data-testid="expense-amount"
                  />
                  <Select
                    value={form.watch("currency")}
                    onValueChange={(value) => form.setValue("currency", value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("expenses.vat")}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.watch("vatRate")}
                  onChange={(event) => form.setValue("vatRate", event.target.value)}
                >
                  {VAT_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t("common.notes")}</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder={t("common.notes")}
                {...form.register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tax Deductibility (DE) Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span>{t("expenses.form.taxDeductibilityTitle")}</span>
              {preview.tone === "green" && (
                <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-0.5">
                  {previewLabel}
                </span>
              )}
              {preview.tone === "amber" && (
                <span className="text-xs bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
                  {previewLabel}
                </span>
              )}
              {preview.tone === "red" && (
                <span className="text-xs bg-red-100 text-red-800 rounded-full px-2 py-0.5">
                  ⛔ {previewLabel}
                </span>
              )}
              {preview.tone === "blue" && (
                <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">
                  ℹ {previewLabel}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {!category ? (
              <p className="text-sm text-muted-foreground">
                {t("expenses.form.selectCategoryHint")}
              </p>
            ) : null}

            {/* Participants (Bewirtung) */}
            {req.participants ? (
              <div className="space-y-2">
                <Label htmlFor="participants">
                  {t("expenses.form.participants")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="participants"
                  placeholder={t("expenses.form.participantsPlaceholder")}
                  data-testid="expense-participants"
                  {...form.register("participants")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("expenses.form.participantsHint")}
                </p>
              </div>
            ) : null}

            {/* Occasion */}
            {req.occasion ? (
              <div className="space-y-2">
                <Label htmlFor="occasion">
                  {t("expenses.form.businessOccasion")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="occasion"
                  placeholder={t("expenses.form.businessOccasionPlaceholder")}
                  data-testid="expense-occasion"
                  {...form.register("occasion")}
                />
              </div>
            ) : null}

            {/* Client meals note */}
            {category === "MEALS_CLIENT_ENTERTAINMENT" || category === "meals" ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{t("expenses.form.clientMealsHint")}</span>
              </div>
            ) : null}

            {/* Gift recipient */}
            {req.recipient ? (
              <div className="space-y-2">
                <Label htmlFor="recipient">
                  {t("expenses.form.giftRecipient")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="recipient"
                  placeholder={t("expenses.form.giftRecipientPlaceholder")}
                  data-testid="expense-recipient"
                  {...form.register("recipient")}
                />
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{t("expenses.form.giftRecipientHint")}</span>
                </div>
              </div>
            ) : null}

            {/* Mixed-use business percent */}
            {req.businessUsePercent ? (
              <div className="space-y-2">
                <Label htmlFor="businessUsePercent">
                  {t("expenses.form.businessUsePercent")}{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="businessUsePercent"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    placeholder={t("expenses.form.businessUsePercentPlaceholder")}
                    className="w-32"
                    data-testid="expense-business-use-percent"
                    {...form.register("businessUsePercent")}
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("expenses.form.businessUsePercentHint")}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Travel per-diem */}
            {req.travelMeta ? (
              <div className="space-y-3">
                <Label>{t("expenses.form.travelDetails")}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="travelDate" className="text-xs">
                      {t("expenses.form.travelDate")}
                    </Label>
                    <Input id="travelDate" type="date" {...form.register("travelDate")} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="absenceHours" className="text-xs">
                      {t("expenses.form.absenceHours")}
                    </Label>
                    <Input
                      id="absenceHours"
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      placeholder={t("expenses.form.absenceHoursPlaceholder")}
                      data-testid="expense-absence-hours"
                      {...form.register("absenceHours")}
                    />
                  </div>
                </div>
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                  {t("expenses.form.travelHint")}
                </div>
              </div>
            ) : null}

            {/* Home office */}
            {req.homeOfficeDays ? (
              <div className="space-y-2">
                <Label htmlFor="homeOfficeDays">
                  {t("expenses.form.homeOfficeDays")} <span className="text-destructive">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="homeOfficeDays"
                    type="number"
                    min={0}
                    step={1}
                    placeholder={t("expenses.form.homeOfficeDaysPlaceholder")}
                    className="w-32"
                    data-testid="expense-home-office-days"
                    {...form.register("homeOfficeDays")}
                  />
                  <span className="text-sm text-muted-foreground">{t("expenses.form.days")}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("expenses.form.homeOfficeHint")}</p>
              </div>
            ) : null}

            {/* 0% warning for fines & civilian clothing */}
            {category === "FINES_PENALTIES" || category === "CLOTHING_CIVILIAN" ? (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {t("expenses.form.nonDeductibleWarningPrefix")}{" "}
                  <strong>{t("expenses.form.nonDeductibleWarningStrong")}</strong>{" "}
                  {t("expenses.form.nonDeductibleWarningSuffix")}
                </span>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-sm text-muted-foreground">
              {t("expenses.form.receiptOptional")}
            </div>
            <div className="space-y-3">
              <Button variant="outline" type="button" className="w-full justify-start" asChild>
                <label htmlFor="expense-receipt-files" className="cursor-pointer">
                  <Paperclip className="h-4 w-4 mr-2" />
                  {t("expenses.form.addReceiptFiles")}
                </label>
              </Button>
              <input
                id="expense-receipt-files"
                type="file"
                accept="image/*,.pdf,application/pdf"
                multiple
                className="sr-only"
                onChange={handleReceiptSelection}
              />
              {receiptFiles.length === 0 ? (
                <div className="border border-dashed border-border rounded-md p-4 text-sm text-muted-foreground">
                  {t("expenses.form.uploadReceiptHint")}
                </div>
              ) : (
                <div className="space-y-2">
                  {receiptFiles.map((file, index) => (
                    <div
                      key={`${file.name}:${file.size}:${file.lastModified}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="truncate text-sm">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeReceiptFile(index)}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {receiptError ? (
                <div className="text-xs text-destructive" role="alert">
                  {receiptError}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button
            variant="accent"
            type="submit"
            data-testid="expense-submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? t("common.saving") : (submitLabel ?? t("common.save"))}
          </Button>
          <Button variant="outline" type="button" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        </div>
      </div>
    </form>
  );
};
