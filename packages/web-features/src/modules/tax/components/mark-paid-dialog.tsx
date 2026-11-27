import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import { Button } from "@corely/ui";
import type { MarkTaxFilingPaidRequest } from "@corely/contracts";
import { MarkPaidForm } from "./mark-paid-form";

type MarkPaidDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: MarkTaxFilingPaidRequest) => void | Promise<void>;
  isSubmitting?: boolean;
  defaultAmountCents?: number | null;
};

export function MarkPaidDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  defaultAmountCents,
}: MarkPaidDialogProps) {
  const uiCopy = useUiCopy("ui.tax-mark-paid-dialog");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{uiCopy("mark-as-paid")}</DialogTitle>
          <DialogDescription>{uiCopy("record-the-payment-details")}</DialogDescription>
        </DialogHeader>
        <MarkPaidForm
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          defaultAmountCents={defaultAmountCents}
        />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {uiCopy("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
