import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge, Button, Input } from "@corely/ui";
import type {
  CashEntryAttachment,
  CashEntryTaxMode,
  CashEntryType,
  TaxProfileDto,
  TaxRateDto,
  UpsertTaxProfileInput,
} from "@corely/contracts";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { taxApi } from "@corely/web-shared/lib/tax-api";
import { CrudListPageLayout, CrudRowActions } from "@corely/web-shared/shared/crud";
import { formatDateTime, formatMoney } from "@corely/web-shared/shared/lib/formatters";
import { Paperclip } from "lucide-react";
import { cashKeys, invalidateCashRegisterQueries } from "../queries";
import { uploadBelegDocument } from "../upload-beleg-document";
import {
  AttachBelegDialog,
  type AttachBelegForm,
  CreateEntryDialog,
  defaultCreateForm,
  type CreateEntryForm,
  ReverseEntryDialog,
} from "./cash-entries-dialogs";

type Filters = {
  dayKeyFrom: string;
  dayKeyTo: string;
  type: string;
  source: string;
  q: string;
};

const entryTypes = [
  "SALE_CASH",
  "REFUND_CASH",
  "EXPENSE_CASH",
  "OWNER_DEPOSIT",
  "OWNER_WITHDRAWAL",
  "BANK_DEPOSIT",
  "BANK_WITHDRAWAL",
  "OPENING_FLOAT",
] as const;
const entrySources = ["MANUAL", "SALES", "EXPENSE", "DIFFERENCE", "IMPORT", "INTEGRATION"] as const;

const defaultFilters: Filters = {
  dayKeyFrom: "",
  dayKeyTo: "",
  type: "",
  source: "",
  q: "",
};

const defaultAttachBelegForm = (): AttachBelegForm => ({
  attachmentFile: null,
});

const deriveDirectionFromType = (type: CashEntryType): "IN" | "OUT" => {
  switch (type) {
    case "REFUND_CASH":
    case "EXPENSE_CASH":
    case "OWNER_WITHDRAWAL":
    case "BANK_DEPOSIT":
      return "OUT";
    default:
      return "IN";
  }
};

const isTaxRelevantType = (type: CashEntryType): boolean => {
  return type === "SALE_CASH" || type === "REFUND_CASH" || type === "EXPENSE_CASH";
};

const deriveTaxModeFromType = (type: CashEntryType): CashEntryTaxMode => {
  return type === "EXPENSE_CASH" ? "INPUT_VAT" : "OUTPUT_VAT";
};

const requiresSupportingDocument = (type: CashEntryType): boolean => {
  return type !== "OPENING_FLOAT";
};

const requiresTaxCodeForType = (type: CashEntryType, profile: TaxProfileDto | null | undefined) => {
  return (type === "SALE_CASH" || type === "REFUND_CASH") && profile?.regime === "STANDARD_VAT";
};

const requiresTaxProfileForType = (type: CashEntryType): boolean => {
  return type === "SALE_CASH" || type === "REFUND_CASH";
};

const createDefaultGermanTaxProfile = (regime: TaxProfileDto["regime"]): UpsertTaxProfileInput => ({
  country: "DE",
  regime,
  vatEnabled: regime === "STANDARD_VAT",
  currency: "EUR",
  filingFrequency: "MONTHLY",
  taxYearStartMonth: 1,
  vatAccountingMethod: "IST",
  effectiveFrom: new Date().toISOString(),
});

const resolveEffectiveRate = (rates: TaxRateDto[] | undefined, at: Date): number | null => {
  if (!rates || rates.length === 0) {
    return null;
  }

  const match = rates.find((rate) => {
    const start = new Date(rate.effectiveFrom);
    const end = rate.effectiveTo ? new Date(rate.effectiveTo) : null;
    return start <= at && (!end || at <= end);
  });

  return match?.rateBps ?? rates[0]?.rateBps ?? null;
};

const calculateGrossFirstBreakdown = (grossAmountCents: number, rateBps: number | null) => {
  if (!rateBps || rateBps <= 0) {
    return {
      grossAmountCents,
      netAmountCents: grossAmountCents,
      taxAmountCents: 0,
    };
  }

  const netAmountCents = Math.round((grossAmountCents * 10_000) / (10_000 + rateBps));
  return {
    grossAmountCents,
    netAmountCents,
    taxAmountCents: grossAmountCents - netAmountCents,
  };
};

export function CashEntriesScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateEntryForm>(defaultCreateForm);
  const [reverseTargetId, setReverseTargetId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState("");
  const [belegEntryId, setBelegEntryId] = useState<string | null>(null);
  const [attachBelegForm, setAttachBelegForm] = useState<AttachBelegForm>(defaultAttachBelegForm);

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const queryParams = useMemo(
    () => ({
      registerId: id,
      dayKeyFrom: filters.dayKeyFrom || undefined,
      dayKeyTo: filters.dayKeyTo || undefined,
      type: (filters.type as CashEntryType | "") || undefined,
      source: filters.source || undefined,
      q: filters.q || undefined,
    }),
    [filters, id]
  );

  const entriesQuery = useQuery({
    queryKey: id ? cashKeys.entries.list(queryParams) : ["cash-entries", "missing-id"],
    queryFn: () =>
      cashManagementApi.listEntries(id as string, {
        dayKeyFrom: queryParams.dayKeyFrom,
        dayKeyTo: queryParams.dayKeyTo,
        type: queryParams.type,
        source: queryParams.source,
        q: queryParams.q,
      }),
    enabled: Boolean(id),
  });

  const taxProfileQuery = useQuery({
    queryKey: ["tax-profile"],
    queryFn: () => taxApi.getProfile(),
  });

  const taxCodesQuery = useQuery({
    queryKey: ["tax-codes"],
    queryFn: () => taxApi.listTaxCodes(),
    enabled: createOpen,
  });

  const selectedTaxRateQuery = useQuery({
    queryKey: ["tax-rates", createForm.taxCodeId],
    queryFn: () => taxApi.listTaxRates(createForm.taxCodeId),
    enabled: createOpen && createForm.taxCodeId.length > 0,
  });

  const entries = useMemo(() => entriesQuery.data?.entries ?? [], [entriesQuery.data?.entries]);

  const attachmentQueries = useQueries({
    queries: entries.slice(0, 50).map((entry) => ({
      queryKey: cashKeys.entries.attachments(entry.id),
      queryFn: () => cashManagementApi.listAttachments(entry.id),
      staleTime: 60_000,
    })),
  });

  const attachmentCountByEntryId = useMemo(() => {
    const counts = new Map<string, number>();
    entries.slice(0, 50).forEach((entry, index) => {
      counts.set(entry.id, attachmentQueries[index]?.data?.attachments.length ?? 0);
    });
    return counts;
  }, [attachmentQueries, entries]);

  const attachmentsByEntryId = useMemo(() => {
    const attachments = new Map<string, CashEntryAttachment[]>();
    entries.slice(0, 50).forEach((entry, index) => {
      attachments.set(entry.id, attachmentQueries[index]?.data?.attachments ?? []);
    });
    return attachments;
  }, [attachmentQueries, entries]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing register id");
      }
      const grossAmountCents = Math.round(Number(createForm.grossAmountInput) * 100);
      const occurredAt = createForm.occurredAt
        ? new Date(createForm.occurredAt).toISOString()
        : new Date().toISOString();
      const uploadedDocumentId = createForm.attachmentFile
        ? await uploadBelegDocument(createForm.attachmentFile)
        : null;
      const created = await cashManagementApi.createEntry(id, {
        type: createForm.type,
        direction: deriveDirectionFromType(createForm.type),
        source: "MANUAL",
        description: createForm.description.trim(),
        grossAmountCents,
        occurredAt,
        tax: isTaxRelevantType(createForm.type)
          ? {
              mode: createForm.taxCodeId ? deriveTaxModeFromType(createForm.type) : "NONE",
              taxCodeId: createForm.taxCodeId || undefined,
            }
          : { mode: "NONE" },
        sourceDocument:
          uploadedDocumentId || createForm.documentReference.trim()
            ? {
                documentId: uploadedDocumentId ?? undefined,
                reference: createForm.documentReference.trim() || undefined,
                kind: uploadedDocumentId ? "ATTACHMENT" : "REFERENCE",
              }
            : undefined,
      });
      if (uploadedDocumentId) {
        await cashManagementApi.attachBeleg(created.entry.id, {
          documentId: uploadedDocumentId,
        });
      }
    },
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      setCreateOpen(false);
      setCreateForm(defaultCreateForm());
    },
  });

  const configureTaxProfileMutation = useMutation({
    mutationFn: async (regime: TaxProfileDto["regime"]) => {
      await taxApi.upsertProfile(createDefaultGermanTaxProfile(regime));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tax-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["tax-codes"] });
      await queryClient.invalidateQueries({ queryKey: ["tax-rates"] });
    },
  });

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (!reverseTargetId) {
        throw new Error("Missing entry id");
      }
      await cashManagementApi.reverseEntry(reverseTargetId, {
        reason: reverseReason.trim(),
      });
    },
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      setReverseTargetId(null);
      setReverseReason("");
    },
  });

  const attachMutation = useMutation({
    mutationFn: async () => {
      if (!belegEntryId) {
        throw new Error("Missing entry id");
      }
      if (!attachBelegForm.attachmentFile) {
        throw new Error("Missing beleg file");
      }
      const documentId = await uploadBelegDocument(attachBelegForm.attachmentFile);
      await cashManagementApi.attachBeleg(belegEntryId, {
        documentId,
      });
    },
    onSuccess: async () => {
      if (!id || !belegEntryId) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      await queryClient.invalidateQueries({ queryKey: cashKeys.entries.attachments(belegEntryId) });
      setBelegEntryId(null);
      setAttachBelegForm(defaultAttachBelegForm());
    },
  });

  const downloadAttachmentsMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const attachments = attachmentsByEntryId.get(entryId) ?? [];
      for (const [index, attachment] of attachments.entries()) {
        const blob = await cashManagementApi.downloadDocument(attachment.documentId);
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download =
          attachments.length > 1 ? `cash-beleg-${entryId}-${index + 1}` : `cash-beleg-${entryId}`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }
    },
  });

  if (!id) {
    return null;
  }

  if (registerQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.common.loadingRegister")}</div>
    );
  }

  if (!registerQuery.data?.register) {
    return (
      <div className="p-6 text-sm text-destructive">{t("cash.ui.common.registerNotFound")}</div>
    );
  }

  const register = registerQuery.data.register;
  const entryTypeLabel = (value: string): string =>
    t(`cash.ui.enums.entryType.${value}`, { defaultValue: value });
  const entrySourceLabel = (value: string): string =>
    t(`cash.ui.enums.entrySource.${value}`, { defaultValue: value });
  const directionLabel = (value: string): string =>
    t(`cash.ui.enums.direction.${value}`, { defaultValue: value });

  const createAmount = Math.round(Number(createForm.grossAmountInput || 0) * 100);
  const createDirection = deriveDirectionFromType(createForm.type);
  const projectedBalance =
    register.currentBalanceCents + (createDirection === "OUT" ? -createAmount : createAmount);
  const hasBookingText = Boolean(createForm.description.trim());
  const hasSupportingDocument =
    createForm.attachmentFile !== null || Boolean(createForm.documentReference.trim());
  const taxProfileMissing = !taxProfileQuery.data;
  const requiresTaxProfileSetup = requiresTaxProfileForType(createForm.type) && taxProfileMissing;
  const taxCodeRequired = requiresTaxCodeForType(createForm.type, taxProfileQuery.data);
  const expenseTaxRequiresAttachment =
    createForm.type === "EXPENSE_CASH" && createForm.taxCodeId.length > 0 && !hasSupportingDocument;
  const canSaveCreateEntry =
    !Number.isNaN(createAmount) &&
    createAmount > 0 &&
    hasBookingText &&
    !requiresTaxProfileSetup &&
    (!requiresSupportingDocument(createForm.type) || hasSupportingDocument) &&
    (!taxCodeRequired || createForm.taxCodeId.length > 0) &&
    !expenseTaxRequiresAttachment;

  const createOccurredAt = createForm.occurredAt ? new Date(createForm.occurredAt) : new Date();
  const selectedRateBps = resolveEffectiveRate(selectedTaxRateQuery.data, createOccurredAt);
  const taxRelevant = isTaxRelevantType(createForm.type);
  const taxSummary =
    taxRelevant && !requiresTaxProfileSetup
      ? calculateGrossFirstBreakdown(createAmount > 0 ? createAmount : 0, selectedRateBps)
      : null;
  const taxCodeOptions = (taxCodesQuery.data ?? [])
    .filter((code) => code.isActive)
    .map((code) => ({
      id: code.id,
      label: `${code.code} - ${code.label}`,
    }));
  const taxCodeLabel =
    createForm.type === "EXPENSE_CASH"
      ? t("cash.ui.entries.createDialog.inputVat")
      : t("cash.ui.entries.createDialog.outputVat");
  const taxHint =
    createForm.type === "EXPENSE_CASH"
      ? t("cash.ui.entries.createDialog.expenseVatHint")
      : taxCodeRequired
        ? t("cash.ui.entries.createDialog.salesVatRequiredHint")
        : t("cash.ui.entries.createDialog.salesVatOptionalHint");

  return (
    <>
      <CrudListPageLayout
        title={t("cash.ui.entries.title", { register: register.name })}
        subtitle={t("cash.ui.entries.subtitle")}
        primaryAction={
          <Button
            onClick={() => {
              setCreateForm(defaultCreateForm());
              setCreateOpen(true);
            }}
          >
            {t("cash.ui.entries.newCashEntry")}
          </Button>
        }
        toolbar={
          <Button variant="outline" asChild>
            <Link to={`/cash/registers/${id}`}>{t("cash.ui.entries.backToRegister")}</Link>
          </Button>
        }
        filters={
          <>
            <Input
              type="date"
              value={filters.dayKeyFrom}
              aria-label={t("cash.ui.entries.filters.dayFrom")}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, dayKeyFrom: event.target.value }))
              }
            />
            <Input
              type="date"
              value={filters.dayKeyTo}
              aria-label={t("cash.ui.entries.filters.dayTo")}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, dayKeyTo: event.target.value }))
              }
            />
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filters.type}
              onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            >
              <option value="">{t("cash.ui.entries.filters.allTypes")}</option>
              {entryTypes.map((value) => (
                <option key={value} value={value}>
                  {entryTypeLabel(value)}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filters.source}
              onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))}
            >
              <option value="">{t("cash.ui.entries.filters.allSources")}</option>
              {entrySources.map((value) => (
                <option key={value} value={value}>
                  {entrySourceLabel(value)}
                </option>
              ))}
            </select>
            <Input
              value={filters.q}
              onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              placeholder={t("cash.ui.entries.filters.searchDescription")}
              className="w-48"
            />
          </>
        }
      >
        {entriesQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.entries.loading")}</div>
        ) : entriesQuery.isError ? (
          <div className="p-6 text-sm text-destructive">{t("cash.ui.entries.loadFailed")}</div>
        ) : entries.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">{t("cash.ui.entries.empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.dateTime")}</th>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.entryNo")}</th>
                  <th className="px-4 py-3 font-medium">
                    {t("cash.ui.entries.table.description")}
                  </th>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.type")}</th>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.direction")}</th>
                  <th className="px-4 py-3 font-medium text-right">
                    {t("cash.ui.entries.table.amount")}
                  </th>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.tax")}</th>
                  <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.source")}</th>
                  <th className="px-4 py-3 font-medium text-right">
                    {t("cash.ui.entries.table.balanceAfter")}
                  </th>
                  <th className="px-4 py-3 font-medium text-center">
                    {t("cash.ui.entries.table.beleg")}
                  </th>
                  <th className="px-4 py-3 font-medium text-right">
                    {t("cash.ui.entries.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-border/40">
                    <td className="px-4 py-3">{formatDateTime(entry.occurredAt)}</td>
                    <td className="px-4 py-3">{entry.entryNo}</td>
                    <td className="px-4 py-3">{entry.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{entryTypeLabel(entry.type)}</Badge>
                    </td>
                    <td className="px-4 py-3">{directionLabel(entry.direction)}</td>
                    <td className="px-4 py-3 text-right">
                      {entry.direction === "OUT" ? "-" : "+"}
                      {formatMoney(entry.grossAmountCents, undefined, entry.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {entry.taxMode && entry.taxMode !== "NONE"
                        ? `${entry.taxLabel ?? entry.taxCode ?? t("cash.ui.entries.table.tax")} (${formatMoney(
                            entry.taxAmountCents ?? 0,
                            undefined,
                            entry.currency
                          )})`
                        : t("cash.ui.entries.createDialog.noVat")}
                    </td>
                    <td className="px-4 py-3">{entrySourceLabel(entry.source)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(entry.balanceAfterCents, undefined, entry.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {attachmentCountByEntryId.get(entry.id) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="mx-auto h-8 px-2"
                          aria-label={t("cash.ui.entries.rowActions.downloadBeleg")}
                          disabled={downloadAttachmentsMutation.isPending}
                          onClick={() => downloadAttachmentsMutation.mutate(entry.id)}
                        >
                          <Paperclip className="h-4 w-4" />
                          <span className="ml-1">{attachmentCountByEntryId.get(entry.id)}</span>
                        </Button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CrudRowActions
                        secondaryActions={[
                          {
                            label: t("cash.ui.entries.rowActions.viewRegister"),
                            href: `/cash/registers/${id}`,
                          },
                          {
                            label: t("cash.ui.entries.rowActions.reverse"),
                            onClick: () => {
                              setReverseTargetId(entry.id);
                              setReverseReason("");
                            },
                            disabled: Boolean(entry.reversedByEntryId),
                          },
                          {
                            label: t("cash.ui.entries.rowActions.addBeleg"),
                            onClick: () => {
                              setBelegEntryId(entry.id);
                              setAttachBelegForm(defaultAttachBelegForm());
                            },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CrudListPageLayout>

      <CreateEntryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        form={createForm}
        setForm={setCreateForm}
        entryTypes={entryTypes}
        entryTypeLabel={entryTypeLabel}
        taxCodeOptions={taxCodeOptions}
        taxRelevant={taxRelevant}
        requiresTaxProfileSetup={requiresTaxProfileSetup}
        isTaxProfileSetupPending={configureTaxProfileMutation.isPending}
        onUseStandardVat={() => configureTaxProfileMutation.mutate("STANDARD_VAT")}
        onUseSmallBusiness={() => configureTaxProfileMutation.mutate("SMALL_BUSINESS")}
        taxCodeRequired={taxCodeRequired}
        taxCodeLabel={taxCodeLabel}
        taxHint={taxHint}
        taxSummary={taxSummary}
        registerCurrency={register.currency}
        projectedBalance={projectedBalance}
        isPending={createMutation.isPending}
        isError={createMutation.isError}
        canSave={canSaveCreateEntry}
        onSave={() => createMutation.mutate()}
      />

      <ReverseEntryDialog
        open={Boolean(reverseTargetId)}
        onOpenChange={(open) => {
          if (!open) {
            setReverseTargetId(null);
          }
        }}
        reason={reverseReason}
        setReason={setReverseReason}
        isPending={reverseMutation.isPending}
        isError={reverseMutation.isError}
        onConfirm={() => reverseMutation.mutate()}
      />

      <AttachBelegDialog
        open={Boolean(belegEntryId)}
        onOpenChange={(open) => {
          if (!open) {
            setBelegEntryId(null);
            setAttachBelegForm(defaultAttachBelegForm());
          }
        }}
        form={attachBelegForm}
        setForm={setAttachBelegForm}
        isPending={attachMutation.isPending}
        isError={attachMutation.isError}
        onAttach={() => attachMutation.mutate()}
      />
    </>
  );
}
