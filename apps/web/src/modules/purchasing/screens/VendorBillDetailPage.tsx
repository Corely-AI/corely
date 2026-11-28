import { PageLoadingSkeleton } from "@corely/web-shared/shared/components/page-loading-skeleton";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  Check,
  Upload,
  CreditCard,
  XCircle,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Input } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Label } from "@corely/ui";
import type { VendorBillLineItemDto } from "@corely/contracts";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { purchasingApi } from "@/lib/purchasing-api";
import { formatMoney } from "@/shared/lib/formatters";

export default function VendorBillDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const billQueryKey = ["vendorBills", activeWorkspaceId, id];
  const [supplierSearch, setSupplierSearch] = useState("");
  const [header, setHeader] = useState({
    supplierPartyId: "",
    billNumber: "",
    billDate: "",
    dueDate: "",
    currency: "",
  });
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: billQueryKey,
    queryFn: () => purchasingApi.getVendorBill(id || ""),
    enabled: Boolean(id && activeWorkspaceId),
  });

  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<VendorBillLineItemDto[]>([]);
  const { data: suppliers } = useQuery({
    queryKey: ["bill-draft-suppliers", activeWorkspaceId, supplierSearch],
    queryFn: () => purchasingApi.listSuppliers({ search: supplierSearch || undefined }),
    enabled: Boolean(data?.sourceFilename && data.status === "DRAFT"),
  });

  useEffect(() => {
    if (data) {
      setNotes(data.notes ?? "");
      setHeader({
        supplierPartyId: data.supplierPartyId ?? "",
        billNumber: data.billNumber ?? "",
        billDate: data.billDate ?? "",
        dueDate: data.dueDate ?? "",
        currency: data.currency ?? "",
      });
      setLineItems(data.lineItems);
      setDirty(false);
    }
  }, [data]);

  const updateHeader = (key: keyof typeof header, value: string) => {
    setDirty(true);
    setHeader((current) => ({ ...current, [key]: value }));
  };

  const updateLine = (index: number, patch: Partial<VendorBillLineItemDto>) => {
    setDirty(true);
    setLineItems((current) =>
      current.map((line, position) => (position === index ? { ...line, ...patch } : line))
    );
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      purchasingApi.updateVendorBill(id || "", {
        headerPatch: data?.sourceFilename
          ? {
              notes,
              supplierPartyId: header.supplierPartyId || null,
              billNumber: header.billNumber.trim() || null,
              billDate: header.billDate || null,
              dueDate: header.dueDate || null,
              currency: header.currency.trim().toUpperCase() || null,
            }
          : { notes },
        lineItems,
      }),
    onSuccess: (bill) => {
      queryClient.setQueryData(billQueryKey, bill);
      void queryClient.invalidateQueries({ queryKey: ["vendorBills", activeWorkspaceId] });
    },
  });

  const original = useMutation({
    mutationFn: () => purchasingApi.getVendorBillOriginal(id || ""),
  });

  const openOriginal = () => {
    const tab = window.open("about:blank", "_blank");
    if (tab) {
      tab.opener = null;
    }
    original.mutate(undefined, {
      onSuccess: ({ url }) => {
        if (tab) {
          tab.location.replace(url);
        } else {
          window.location.assign(url);
        }
      },
      onError: () => tab?.close(),
    });
  };

  const approve = useMutation({
    mutationFn: () => purchasingApi.approveVendorBill(id || ""),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["vendorBills", activeWorkspaceId] }),
  });
  const post = useMutation({
    mutationFn: () => purchasingApi.postVendorBill(id || ""),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["vendorBills", activeWorkspaceId] }),
  });
  const voidBill = useMutation({
    mutationFn: () => purchasingApi.voidVendorBill(id || ""),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["vendorBills", activeWorkspaceId] }),
  });

  if (isLoading) {
    return <PageLoadingSkeleton variant="detail" />;
  }

  if (!data) {
    return (
      <p className="p-6" role="alert">
        {t("purchasing.invoiceEmail.billFailed")}
      </p>
    );
  }

  const editable = data.status === "DRAFT";
  const importedDraft = Boolean(data.sourceFilename && editable);
  const pending =
    updateMutation.isPending || approve.isPending || post.isPending || voidBill.isPending;
  const actionError =
    updateMutation.error ?? approve.error ?? post.error ?? voidBill.error ?? original.error;
  const savedBillComplete =
    data.lineItems.every((line) => line.description.trim()) &&
    Boolean(
      data.supplierPartyId &&
      data.billDate &&
      data.dueDate &&
      data.currency &&
      data.totals.totalCents > 0
    );
  const supplierOptions = suppliers?.suppliers ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("purchasing.vendorBills.title")}
            onClick={() => navigate("/purchasing/vendor-bills")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{t("purchasing.vendorBills.detailTitle")}</h1>
            <div className="flex flex-wrap items-center gap-2 break-all text-sm text-muted-foreground">
              <span>
                {data.billNumber || data.sourceFilename || t("purchasing.statuses.draft")}
              </span>
              <Badge>{t(`purchasing.statuses.${data.status.toLowerCase()}`)}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (
            <Button variant="accent" disabled={pending} onClick={() => updateMutation.mutate()}>
              <Save className="h-4 w-4" />
              {t("purchasing.actions.saveDraft")}
            </Button>
          )}
          {data.status === "DRAFT" && (
            <Button
              variant="outline"
              disabled={pending || (importedDraft && (dirty || !savedBillComplete))}
              onClick={() => approve.mutate()}
            >
              <Check className="h-4 w-4" />
              {t("purchasing.actions.approve")}
            </Button>
          )}
          {data.status === "APPROVED" && (
            <Button variant="outline" disabled={pending} onClick={() => post.mutate()}>
              <Upload className="h-4 w-4" />
              {t("purchasing.actions.post")}
            </Button>
          )}
          {data.status === "POSTED" && (
            <Button
              variant="outline"
              onClick={() => navigate(`/purchasing/vendor-bills/${data.id}/pay`)}
            >
              <CreditCard className="h-4 w-4" />
              {t("purchasing.actions.recordPayment")}
            </Button>
          )}
          {data.status !== "VOID" && (
            <Button variant="ghost" disabled={pending} onClick={() => voidBill.mutate()}>
              <XCircle className="h-4 w-4" />
              {t("purchasing.actions.void")}
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <p className="text-sm text-destructive" role="alert">
          {actionError.message}
        </p>
      )}
      {importedDraft && (dirty || !savedBillComplete) && (
        <p className="text-sm text-muted-foreground">{t("purchasing.invoiceEmail.reviewHint")}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="order-2 lg:order-none lg:col-span-2">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bill-supplier">{t("purchasing.fields.supplier")}</Label>
                {importedDraft ? (
                  <>
                    <Input
                      aria-label={t("purchasing.invoiceEmail.searchSuppliers")}
                      placeholder={t("purchasing.invoiceEmail.searchSuppliers")}
                      value={supplierSearch}
                      onChange={(event) => setSupplierSearch(event.target.value)}
                    />
                    <select
                      id="bill-supplier"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={header.supplierPartyId}
                      onChange={(event) => updateHeader("supplierPartyId", event.target.value)}
                    >
                      <option value="">{t("purchasing.invoiceEmail.chooseSupplier")}</option>
                      {header.supplierPartyId &&
                        !supplierOptions.some(
                          (supplier) => supplier.id === header.supplierPartyId
                        ) && (
                          <option value={header.supplierPartyId}>{header.supplierPartyId}</option>
                        )}
                      {supplierOptions.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.displayName}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <Input id="bill-supplier" value={header.supplierPartyId} disabled />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-number">{t("purchasing.fields.billNumber")}</Label>
                <Input
                  id="bill-number"
                  value={header.billNumber}
                  disabled={!importedDraft}
                  onChange={(event) => updateHeader("billNumber", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-date">{t("purchasing.fields.billDate")}</Label>
                <Input
                  id="bill-date"
                  type="date"
                  value={header.billDate}
                  disabled={!importedDraft}
                  onChange={(event) => updateHeader("billDate", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-due-date">{t("purchasing.fields.dueDate")}</Label>
                <Input
                  id="bill-due-date"
                  type="date"
                  value={header.dueDate}
                  disabled={!importedDraft}
                  onChange={(event) => updateHeader("dueDate", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bill-currency">{t("purchasing.fields.currency")}</Label>
                <Input
                  id="bill-currency"
                  value={header.currency}
                  disabled={!importedDraft}
                  maxLength={3}
                  onChange={(event) => updateHeader("currency", event.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bill-notes">{t("common.notes")}</Label>
              <Textarea
                id="bill-notes"
                value={notes}
                onChange={(event) => {
                  setNotes(event.target.value);
                  setDirty(true);
                }}
                disabled={!editable}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">{t("purchasing.fields.lineItems")}</h2>
                {importedDraft && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDirty(true);
                      setLineItems((current) => [
                        ...current,
                        { id: crypto.randomUUID(), description: "", quantity: 1, unitCostCents: 0 },
                      ]);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    {t("purchasing.invoiceEmail.addLine")}
                  </Button>
                )}
              </div>
              {lineItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]"
                >
                  <div className="col-span-full space-y-1 sm:col-span-1">
                    <Label htmlFor={`description-${item.id}`}>
                      {t("purchasing.invoiceEmail.lineDescription")}
                    </Label>
                    <Input
                      id={`description-${item.id}`}
                      value={item.description}
                      disabled={!importedDraft}
                      onChange={(event) => updateLine(idx, { description: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`quantity-${item.id}`}>
                      {t("purchasing.invoiceEmail.lineQuantity")}
                    </Label>
                    <Input
                      id={`quantity-${item.id}`}
                      type="number"
                      min={1}
                      value={item.quantity}
                      disabled={!editable}
                      onChange={(event) =>
                        updateLine(idx, { quantity: Number(event.target.value) })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`amount-${item.id}`}>
                      {t("purchasing.invoiceEmail.lineUnitCents")}
                    </Label>
                    <Input
                      id={`amount-${item.id}`}
                      type="number"
                      min={0}
                      value={item.unitCostCents}
                      disabled={!editable}
                      onChange={(event) =>
                        updateLine(idx, { unitCostCents: Number(event.target.value) })
                      }
                    />
                  </div>
                  {importedDraft && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t("purchasing.invoiceEmail.removeLine", { number: idx + 1 })}
                      onClick={() => {
                        setDirty(true);
                        setLineItems((current) => current.filter((line) => line.id !== item.id));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="contents lg:flex lg:flex-col lg:gap-4">
          {data.sourceFilename && (
            <Card className="order-1 lg:order-none">
              <CardContent className="space-y-3 p-6">
                <h2 className="text-lg font-semibold">{t("purchasing.invoiceEmail.original")}</h2>
                <p className="break-all text-sm text-muted-foreground">{data.sourceFilename}</p>
                <Button variant="outline" disabled={original.isPending} onClick={openOriginal}>
                  <ExternalLink className="h-4 w-4" />
                  {t("purchasing.invoiceEmail.openOriginal")}
                </Button>
              </CardContent>
            </Card>
          )}
          <Card className="order-3 lg:order-none">
            <CardContent className="p-6 space-y-3">
              <h2 className="text-lg font-semibold">
                {t("purchasing.vendorBills.amounts.totals")}
              </h2>
              <div className="flex items-center justify-between text-sm">
                <span>{t("purchasing.vendorBills.amounts.subtotal")}</span>
                <span>
                  {data.currency && /^[A-Z]{3}$/.test(data.currency)
                    ? formatMoney(data.totals.subtotalCents, i18n.t("common.locale"), data.currency)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{t("purchasing.vendorBills.amounts.tax")}</span>
                <span>
                  {data.currency && /^[A-Z]{3}$/.test(data.currency)
                    ? formatMoney(data.totals.taxCents, i18n.t("common.locale"), data.currency)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>{t("purchasing.vendorBills.amounts.paid")}</span>
                <span>
                  {data.currency && /^[A-Z]{3}$/.test(data.currency)
                    ? formatMoney(data.totals.paidCents, i18n.t("common.locale"), data.currency)
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span>{t("purchasing.vendorBills.amounts.due")}</span>
                <span>
                  {data.currency && /^[A-Z]{3}$/.test(data.currency)
                    ? formatMoney(data.totals.dueCents, i18n.t("common.locale"), data.currency)
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
