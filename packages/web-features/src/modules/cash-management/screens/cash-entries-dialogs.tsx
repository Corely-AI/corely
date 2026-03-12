import { useRef, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { CashEntryDirection, CashEntryType } from "@corely/contracts";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
} from "@corely/ui";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";

export type CreateEntryForm = {
  direction: CashEntryDirection;
  type: CashEntryType;
  paymentMethod: string;
  description: string;
  occurredAt: string;
  amountInput: string;
  attachmentFile: File | null;
};

function getCurrentDateTimeInputValue(): string {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export const defaultCreateForm = (): CreateEntryForm => ({
  direction: "IN",
  type: "SALE_CASH",
  paymentMethod: "CASH",
  description: "",
  occurredAt: getCurrentDateTimeInputValue(),
  amountInput: "",
  attachmentFile: null,
});

type LabelFn = (value: string) => string;

type CreateEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CreateEntryForm;
  setForm: Dispatch<SetStateAction<CreateEntryForm>>;
  entryDirections: readonly CashEntryDirection[];
  entryTypes: readonly string[];
  paymentMethods: readonly string[];
  directionLabel: LabelFn;
  entryTypeLabel: LabelFn;
  paymentMethodLabel: LabelFn;
  registerCurrency: string;
  projectedBalance: number;
  isPending: boolean;
  isError: boolean;
  canSave: boolean;
  onSave: () => void;
};

export function CreateEntryDialog(props: CreateEntryDialogProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    open,
    onOpenChange,
    form,
    setForm,
    entryDirections,
    entryTypes,
    paymentMethods,
    directionLabel,
    entryTypeLabel,
    paymentMethodLabel,
    registerCurrency,
    projectedBalance,
    isPending,
    isError,
    canSave,
    onSave,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{t("cash.ui.entries.createDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="create-entry-direction">
                {t("cash.ui.entries.createDialog.direction")}
              </Label>
              <select
                id="create-entry-direction"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.direction}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    direction: event.target.value as CashEntryDirection,
                  }))
                }
              >
                {entryDirections.map((value) => (
                  <option key={value} value={value}>
                    {directionLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-entry-amount">
                {t("cash.ui.entries.createDialog.amount")}
              </Label>
              <Input
                id="create-entry-amount"
                type="number"
                step="0.01"
                value={form.amountInput}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, amountInput: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="create-entry-type">{t("cash.ui.entries.createDialog.type")}</Label>
              <select
                id="create-entry-type"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    type: event.target.value as CashEntryType,
                  }))
                }
              >
                {entryTypes.map((value) => (
                  <option key={value} value={value}>
                    {entryTypeLabel(value)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="create-entry-payment-method">
                {t("cash.ui.entries.createDialog.paymentMethod")}
              </Label>
              <select
                id="create-entry-payment-method"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.paymentMethod}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, paymentMethod: event.target.value }))
                }
              >
                {paymentMethods.map((value) => (
                  <option key={value} value={value}>
                    {paymentMethodLabel(value)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-entry-description">
              {t("cash.ui.entries.createDialog.description")}
            </Label>
            <Textarea
              id="create-entry-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-entry-occurred-at">
              {t("cash.ui.entries.createDialog.occurredAt")}
            </Label>
            <Input
              id="create-entry-occurred-at"
              type="datetime-local"
              value={form.occurredAt}
              onChange={(event) => setForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="create-entry-attachment">
              {t("cash.ui.entries.createDialog.attachBeleg")}
            </Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
              >
                {form.attachmentFile
                  ? t("cash.ui.entries.createDialog.replaceAttachment")
                  : t("cash.ui.entries.createDialog.chooseAttachment")}
              </Button>
              <span className="truncate text-sm text-muted-foreground">
                {form.attachmentFile?.name ?? t("cash.ui.entries.createDialog.noAttachment")}
              </span>
            </div>
            <input
              ref={fileInputRef}
              id="create-entry-attachment"
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setForm((prev) => ({ ...prev, attachmentFile: file }));
                event.currentTarget.value = "";
              }}
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {t("cash.ui.entries.createDialog.projectedBalance")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm font-medium">
              {formatMoney(projectedBalance, undefined, registerCurrency)}
            </CardContent>
          </Card>
          {isError ? (
            <p className="text-sm text-destructive">{t("cash.ui.entries.createDialog.failed")}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cash.ui.common.cancel")}
          </Button>
          <Button onClick={onSave} disabled={isPending || !canSave}>
            {isPending && form.attachmentFile
              ? t("cash.ui.entries.createDialog.uploading")
              : t("cash.ui.entries.createDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ReverseEntryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: string;
  setReason: (value: string) => void;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
};

export function ReverseEntryDialog(props: ReverseEntryDialogProps) {
  const { t } = useTranslation();
  const { open, onOpenChange, reason, setReason, isPending, isError, onConfirm } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cash.ui.entries.reverseDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reverse-reason">{t("cash.ui.entries.reverseDialog.reason")}</Label>
          <Textarea
            id="reverse-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {isError ? (
            <p className="text-sm text-destructive">{t("cash.ui.entries.reverseDialog.failed")}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cash.ui.common.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending || !reason.trim()}>
            {t("cash.ui.entries.reverseDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type AttachBelegDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  setDocumentId: (value: string) => void;
  isPending: boolean;
  isError: boolean;
  onAttach: () => void;
};

export function AttachBelegDialog(props: AttachBelegDialogProps) {
  const { t } = useTranslation();
  const { open, onOpenChange, documentId, setDocumentId, isPending, isError, onAttach } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cash.ui.entries.attachmentDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="beleg-document-id">
            {t("cash.ui.entries.attachmentDialog.documentId")}
          </Label>
          <Input
            id="beleg-document-id"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
          />
          {isError ? (
            <p className="text-sm text-destructive">
              {t("cash.ui.entries.attachmentDialog.failed")}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cash.ui.common.cancel")}
          </Button>
          <Button onClick={onAttach} disabled={isPending || !documentId.trim()}>
            {t("cash.ui.entries.attachmentDialog.attach")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
