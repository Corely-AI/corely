import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@corely/ui";
import { Button } from "@corely/ui";

type ConfirmDeleteDialogProps = {
  title?: string;
  description?: string;
  trigger?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ConfirmDeleteDialog: React.FC<ConfirmDeleteDialogProps> = ({
  title = "Delete item",
  description = "This action cannot be undone. Are you sure?",
  trigger,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isLoading,
  onConfirm,
  open,
  onOpenChange,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger !== null ? (
        <AlertDialogTrigger asChild>
          {trigger ?? (
            <Button variant="destructive" size="sm">
              {confirmLabel}
            </Button>
          )}
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
