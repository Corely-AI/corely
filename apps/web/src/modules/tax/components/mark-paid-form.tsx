import React from "react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
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
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [paidAt, setPaidAt] = React.useState(() => new Date().toISOString().slice(0, 16));
  const [method, setMethod] = React.useState("manual");
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
        toast.error("Failed to upload receipt");
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
        <Label>Paid at</Label>
        <Input
          type="datetime-local"
          value={paidAt}
          onChange={(event) => setPaidAt(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>Method</Label>
        <Input value={method} onChange={(event) => setMethod(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label>Amount</Label>
        <Input value={amount} onChange={(event) => setAmount(event.target.value)} />
      </div>
      {allowReceiptUpload ? (
        <div className="grid gap-2">
          <Label>Receipt</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isUploading}
            >
              {receiptFile ? "Replace receipt" : "Upload receipt"}
            </Button>
            {receiptFile ? (
              <span className="text-sm text-muted-foreground truncate">{receiptFile.name}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Optional</span>
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
        {isUploading ? "Uploading..." : "Mark paid"}
      </Button>
    </div>
  );
}
