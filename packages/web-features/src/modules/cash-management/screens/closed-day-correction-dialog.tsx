import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@corely/ui";
import type { CashEntry } from "@corely/contracts";
import { formatMoney } from "@corely/web-shared/shared/lib/formatters";

export type ClosedDayConflict = {
  dayKey: string;
  closedAt: string | null;
  currentBalanceCents: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: ClosedDayConflict | null;
  reason: string;
  setReason: (reason: string) => void;
  correctionType: "MISSING_ENTRY" | "REVERSE_ENTRY" | "REPLACE_ENTRY" | "BALANCE_EXPLANATION";
  setCorrectionType: (type: Props["correctionType"]) => void;
  correctionTypeLocked: boolean;
  originalEntries: CashEntry[];
  originalEntriesLoading: boolean;
  originalEntriesError: boolean;
  originalEntryId: string;
  setOriginalEntryId: (entryId: string) => void;
  registerCurrency: string;
  cashIsInRegister: boolean;
  setCashIsInRegister: (value: boolean) => void;
  isPending: boolean;
  isError: boolean;
  onConfirm: () => void;
};

export function ClosedDayCorrectionDialog(props: Props) {
  const uiCopy = useUiCopy("ui.cash-management-closed-day-correction-dialog");
  const {
    open,
    onOpenChange,
    conflict,
    reason,
    setReason,
    correctionType,
    setCorrectionType,
    correctionTypeLocked,
    originalEntries,
    originalEntriesLoading,
    originalEntriesError,
    originalEntryId,
    setOriginalEntryId,
    registerCurrency,
    cashIsInRegister,
    setCashIsInRegister,
    isPending,
    isError,
    onConfirm,
  } = props;
  const day = conflict?.dayKey
    ? new Date(`${conflict.dayKey}T00:00:00`).toLocaleDateString("vi-VN")
    : "";
  const closedAt = conflict?.closedAt ? new Date(conflict.closedAt).toLocaleString("vi-VN") : "";
  const needsOriginalEntry =
    correctionType === "REVERSE_ENTRY" || correctionType === "REPLACE_ENTRY";
  const needsCashConfirmation = correctionType === "MISSING_ENTRY";
  const canConfirm =
    reason.trim().length >= 3 &&
    (!needsOriginalEntry || originalEntryId.length > 0) &&
    (!needsCashConfirmation || cashIsInRegister);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{uiCopy("ie-u-chi-nh")}</DialogTitle>
          <DialogDescription>
            {uiCopy("nga-y") + " "}
            {day}
            {" " + uiCopy("a-u-o-c")}
            {closedAt ? ` lúc ${closedAt}` : ""}
            {uiCopy("bu-t-toa-n")}
          </DialogDescription>
        </DialogHeader>
        <Alert>
          <AlertTitle>{uiCopy("kho-ng-co-giao")}</AlertTitle>
          <AlertDescription>
            {uiCopy("so-du-hie-n")}{" "}
            {formatMoney(conflict?.currentBalanceCents ?? 0, undefined, registerCurrency)}
            {uiCopy("bu-t-toa-n-2")}
          </AlertDescription>
        </Alert>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="closed-day-correction-type">{uiCopy("loa-i-ie-u")}</Label>
            <select
              id="closed-day-correction-type"
              className="h-11 w-full rounded-md border bg-background px-3 text-base sm:h-10 sm:text-sm"
              value={correctionType}
              onChange={(event) => setCorrectionType(event.target.value as Props["correctionType"])}
              disabled={correctionTypeLocked}
            >
              <option value="MISSING_ENTRY">{uiCopy("thie-u-doanh-thu")}</option>
              <option value="REVERSE_ENTRY">{uiCopy("giao-di-ch-tru")}</option>
              <option value="REPLACE_ENTRY">{uiCopy("sai-so-tie-n")}</option>
              <option value="BALANCE_EXPLANATION">{uiCopy("gia-i-thi-ch")}</option>
            </select>
          </div>
          {needsOriginalEntry ? (
            <div className="space-y-1">
              <Label htmlFor="closed-day-original-entry">{uiCopy("bu-t-toa-n-3")}</Label>
              <select
                id="closed-day-original-entry"
                className="min-h-11 w-full rounded-md border bg-background px-3 py-2 text-base sm:min-h-10 sm:text-sm"
                value={originalEntryId}
                onChange={(event) => setOriginalEntryId(event.target.value)}
                disabled={originalEntriesLoading}
              >
                <option value="">
                  {originalEntriesLoading ? uiCopy("ang-ta-i-bu") : uiCopy("cho-n-bu-t")}
                </option>
                {originalEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    #{entry.entryNo} · {entry.description} · {entry.direction === "OUT" ? "−" : "+"}
                    {formatMoney(entry.grossAmountCents, undefined, entry.currency)}
                  </option>
                ))}
              </select>
              {originalEntriesError ? (
                <p className="text-xs text-destructive">{uiCopy("kho-ng-the-ta")}</p>
              ) : null}
              {!originalEntriesLoading && !originalEntriesError && originalEntries.length === 0 ? (
                <p className="text-xs text-muted-foreground">{uiCopy("kho-ng-co-n")}</p>
              ) : null}
            </div>
          ) : null}
          {correctionType === "REVERSE_ENTRY" ? (
            <Alert>
              <AlertTitle>{uiCopy("he-tho-ng-tu")}</AlertTitle>
              <AlertDescription>{uiCopy("so-tie-n-vat")}</AlertDescription>
            </Alert>
          ) : null}
          {correctionType === "REPLACE_ENTRY" ? (
            <Alert>
              <AlertTitle>{uiCopy("a-o-bu-t")}</AlertTitle>
              <AlertDescription>{uiCopy("hai-bu-t-toa")}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-1">
            <Label htmlFor="closed-day-correction-reason">{uiCopy("ly-do-ba-t")}</Label>
            <Textarea
              id="closed-day-correction-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={uiCopy("vi-du-thie-u")}
            />
          </div>
          {needsCashConfirmation ? (
            <p className="text-xs text-muted-foreground">{uiCopy("ne-u-tie-n")}</p>
          ) : null}
          {needsCashConfirmation ? (
            <label className="flex gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                checked={cashIsInRegister}
                onChange={(event) => setCashIsInRegister(event.target.checked)}
              />
              <span>{uiCopy("to-i-xa-c")}</span>
            </label>
          ) : null}
          {isError ? <p className="text-sm text-destructive">{uiCopy("kho-ng-the-ta-2")}</p> : null}
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {uiCopy("hu-y")}
          </Button>
          <Button onClick={onConfirm} disabled={isPending || !canConfirm}>
            {isPending ? uiCopy("ang-lu-u") : uiCopy("ta-o-bu-t")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
