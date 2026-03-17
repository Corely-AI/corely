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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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
      toast.error(t("tax.attachments.messages.selectFile"));
      return;
    }

    setIsUploading(true);
    try {
      const documentId = await uploadTaxDocument(receiptFile);
      await onAttach(documentId);
      setReceiptFile(null);
    } catch (error) {
      console.error(error);
      toast.error(t("tax.attachments.messages.uploadError"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("tax.attachments.dialog.title")}</DialogTitle>
          <DialogDescription>{t("tax.attachments.dialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || isUploading}
            >
              {receiptFile
                ? t("tax.attachments.dialog.replace")
                : t("tax.attachments.dialog.choose")}
            </Button>
            {receiptFile ? (
              <span className="text-sm text-muted-foreground truncate">{receiptFile.name}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("tax.attachments.dialog.noFile")}
              </span>
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
            {t("tax.history.cancel")}
          </Button>
          <Button onClick={handleAttach} disabled={isSubmitting || isUploading}>
            {isUploading
              ? t("tax.attachments.dialog.uploading")
              : t("tax.attachments.dialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
