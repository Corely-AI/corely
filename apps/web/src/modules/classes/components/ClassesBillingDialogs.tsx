import React from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@corely/ui";
import { BillingSendPromptDialog } from "./BillingSendPromptDialog";

type Props = {
  sendPromptOpen: boolean;
  onSendPromptOpenChange: (open: boolean) => void;
  createdCount: number;
  isSendingInvoices: boolean;
  onConfirmSendInvoices: () => void;
  regenerateInvoicesConfirmOpen: boolean;
  onRegenerateInvoicesConfirmOpenChange: (open: boolean) => void;
  onConfirmRegenerateInvoices: () => void;
  isRegenerateInvoicesPending: boolean;
  regenerateShareTargetInvoiceId: string | null;
  onRegenerateShareTargetInvoiceIdChange: (invoiceId: string | null) => void;
  onConfirmRegenerateShareLink: (invoiceId: string) => void;
};

export function ClassesBillingDialogs({
  sendPromptOpen,
  onSendPromptOpenChange,
  createdCount,
  isSendingInvoices,
  onConfirmSendInvoices,
  regenerateInvoicesConfirmOpen,
  onRegenerateInvoicesConfirmOpenChange,
  onConfirmRegenerateInvoices,
  isRegenerateInvoicesPending,
  regenerateShareTargetInvoiceId,
  onRegenerateShareTargetInvoiceIdChange,
  onConfirmRegenerateShareLink,
}: Props) {
  const { t } = useTranslation();

  return (
    <>
      <BillingSendPromptDialog
        open={sendPromptOpen}
        onOpenChange={onSendPromptOpenChange}
        title={t("classes.billing.sendDialogTitle")}
        description={t("classes.billing.sendDialogDescription", { count: createdCount })}
        cancelLabel={t("classes.billing.sendDialogNo")}
        confirmLabel={t("classes.billing.sendDialogYes")}
        isPending={isSendingInvoices}
        onConfirm={onConfirmSendInvoices}
      />

      <AlertDialog
        open={regenerateInvoicesConfirmOpen}
        onOpenChange={onRegenerateInvoicesConfirmOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("classes.billing.regenerate")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("classes.billing.regenerateConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmRegenerateInvoices}
              disabled={isRegenerateInvoicesPending}
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={regenerateShareTargetInvoiceId !== null}
        onOpenChange={(open) => {
          if (!open) {
            onRegenerateShareTargetInvoiceIdChange(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("classes.billing.regenerateLinkConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("classes.billing.regenerateLinkConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!regenerateShareTargetInvoiceId) {
                  return;
                }
                onConfirmRegenerateShareLink(regenerateShareTargetInvoiceId);
                onRegenerateShareTargetInvoiceIdChange(null);
              }}
            >
              {t("classes.billing.regenerateLinkConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
