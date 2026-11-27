import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { toast } from "sonner";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { uploadTaxDocument } from "../utils/upload-document";
import type { MarkTaxFilingPaidRequest } from "@corely/contracts";

type MarkPaidFormProps = {
  onSubmit: (payload: MarkTaxFilingPaidRequest) => void | Promise<void>;
  isSubmitting?: boolean;
  defaultAmountCents?: number | null;
  allowReceiptUpload?: boolean;
};

export function MarkPaidForm({
  onSubmit,
  isSubmitting,
  defaultAmountCents,
  allowReceiptUpload = true,
}: MarkPaidFormProps) {
  const uiCopy = useUiCopy("ui.tax-mark-paid-form");
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [paidAt, setPaidAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [method, setMethod] = React.useState<MarkTaxFilingPaidRequest["method"]>("bank-transfer");
  const [amount, setAmount] = React.useState<string>(
    defaultAmountCents != null ? (defaultAmountCents / 100).toFixed(2) : ""
  );
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleSubmit = async () => {
    const parsed = Number.parseFloat(amount);
    if (Number.isNaN(parsed)) {
      return;
    }

    let proofDocumentId: string | undefined;

    if (allowReceiptUpload && receiptFile) {
      setIsUploading(true);
      try {
        proofDocumentId = await uploadTaxDocument(receiptFile);
      } catch (error) {
        console.error(error);
        toast.error(uiCopy("failed-to-upload-receipt"));
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    await onSubmit({
      paidAt: new Date(paidAt).toISOString(),
      method,
      amountCents: Math.round(parsed * 100),
      proofDocumentId,
    });
    setReceiptFile(null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>{uiCopy("paid-at")}</Label>
        <Input
          type="datetime-local"
          value={paidAt}
          onChange={(event) => setPaidAt(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>{uiCopy("method")}</Label>
        <Select
          value={method}
          onValueChange={(value) => setMethod(value as MarkTaxFilingPaidRequest["method"])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bank-transfer">{uiCopy("bank-transfer")}</SelectItem>
            <SelectItem value="direct-debit">{uiCopy("direct-debit")}</SelectItem>
            <SelectItem value="other">{uiCopy("other")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label>{uiCopy("amount")}</Label>
        <Input value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>
      {allowReceiptUpload ? (
        <div className="grid gap-2">
          <Label>{uiCopy("receipt")}</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isUploading}
            >
              {receiptFile ? uiCopy("replace-receipt") : uiCopy("upload-receipt")}
            </Button>
            {receiptFile ? (
              <span className="text-sm text-muted-foreground truncate">{receiptFile.name}</span>
            ) : (
              <span className="text-sm text-muted-foreground">{uiCopy("optional")}</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setReceiptFile(file);
                event.currentTarget.value = "";
              }
            }}
          />
        </div>
      ) : null}
      <Button onClick={handleSubmit} disabled={isSubmitting || isUploading || !amount}>
        {isUploading ? uiCopy("uploading") : uiCopy("mark-paid")}
      </Button>
    </div>
  );
}
