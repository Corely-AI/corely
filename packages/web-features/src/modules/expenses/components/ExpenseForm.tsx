import React from "react";
import { FileText, Paperclip, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { Textarea } from "@corely/ui";

const expenseFormSchema = z.object({
  merchantName: z.string().min(1, "Merchant is required"),
  expenseDate: z.string().min(1, "Date is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("EUR"),
  category: z.string().optional(),
  vatRate: z.string().optional(),
  notes: z.string().optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

const CATEGORY_OPTIONS = [
  "office_supplies",
  "software",
  "travel",
  "meals",
  "home_office",
  "education",
  "hardware",
  "phone_internet",
  "other",
] as const;

const VAT_OPTIONS = ["0", "7", "19"];

type ExpenseFormProps = {
  defaultValues?: Partial<ExpenseFormValues>;
  onSubmit: (values: ExpenseFormValues, extras: { receiptFiles: File[] }) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

const ACCEPTED_RECEIPT_MIME_TYPES = new Set(["application/pdf"]);
const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024;
const isSupportedReceipt = (file: File): boolean =>
  file.type.startsWith("image/") ||
  ACCEPTED_RECEIPT_MIME_TYPES.has(file.type) ||
  file.name.toLowerCase().endsWith(".pdf");

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  submitLabel = "Save",
}) => {
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
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [receiptFiles, setReceiptFiles] = React.useState<File[]>([]);
  const [receiptError, setReceiptError] = React.useState<string | null>(null);

  const handleReceiptSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (selected.length === 0) {
      return;
    }
    const validFiles: File[] = [];
    let firstError: string | null = null;

    for (const file of selected) {
      if (!isSupportedReceipt(file)) {
        firstError ??= `${file.name}: only image and PDF are allowed`;
        continue;
      }
      if (file.size > MAX_RECEIPT_SIZE_BYTES) {
        firstError ??= `${file.name}: exceeds 10MB limit`;
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
      <Card className="lg:col-span-2">
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                data-testid="expense-category"
                {...form.register("category")}
                defaultValue={form.getValues("category") ?? ""}
              >
                <option value="">Select</option>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchantName">Merchant</Label>
              <Input
                id="merchantName"
                placeholder="e.g. Internet subscription"
                {...form.register("merchantName")}
                data-testid="expense-description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expenseDate">Date</Label>
              <Input type="date" id="expenseDate" {...form.register("expenseDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
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
              <Label>VAT</Label>
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
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} placeholder="Notes" {...form.register("notes")} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="text-sm text-muted-foreground">Receipt (optional)</div>
            <div className="space-y-3">
              <Button
                variant="outline"
                type="button"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Add receipt files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                multiple
                className="hidden"
                onChange={handleReceiptSelection}
              />
              {receiptFiles.length === 0 ? (
                <div className="border border-dashed border-border rounded-md p-4 text-sm text-muted-foreground">
                  Upload image or PDF receipts now. They will be attached when you save.
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
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
};
