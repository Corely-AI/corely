import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Mark as paid</DialogTitle>
          <DialogDescription>
            Record the payment details and optionally attach a receipt.
          </DialogDescription>
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
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
