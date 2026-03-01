import React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import { Button } from "@corely/ui";
import { uploadTaxDocument } from "../utils/upload-document";

type AttachReceiptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttach: (documentId: string) => void | Promise<void>;
  isSubmitting?: boolean;
};

export function AttachReceiptDialog({
  open,
  onOpenChange,
  onAttach,
  isSubmitting,
}: AttachReceiptDialogProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setReceiptFile(null);
    }
  }, [open]);

  const handleAttach = async () => {
    if (!receiptFile) {
      toast.error("Select a receipt to upload");
      return;
    }

    setIsUploading(true);
    try {
      const documentId = await uploadTaxDocument(receiptFile);
      await onAttach(documentId);
      setReceiptFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Attach receipt</DialogTitle>
          <DialogDescription>Upload proof of payment for this filing.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isUploading}
            >
              {receiptFile ? "Replace receipt" : "Choose receipt"}
            </Button>
            {receiptFile ? (
              <span className="text-sm text-muted-foreground truncate">{receiptFile.name}</span>
            ) : (
              <span className="text-sm text-muted-foreground">No file selected</span>
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
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting || isUploading}
          >
            Cancel
          </Button>
          <Button onClick={handleAttach} disabled={isSubmitting || isUploading}>
            {isUploading ? "Uploading..." : "Attach receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
