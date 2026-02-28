import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge, Button, Input } from "@corely/ui";
import type { CashEntryDirection, CashEntryType } from "@corely/contracts";
import { Paperclip } from "lucide-react";
import { CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import { formatDateTime, formatMoney } from "@/shared/lib/formatters";
import { cashManagementApi } from "@/lib/cash-management-api";
import { cashKeys, invalidateCashRegisterQueries } from "../queries";
import {
  AttachBelegDialog,
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
  paymentMethod: string;
  q: string;
};

const entryDirections = ["IN", "OUT"] as const;
const entryTypes = [
  "SALE_CASH",
  "REFUND_CASH",
  "EXPENSE_CASH",
  "OWNER_DEPOSIT",
  "OWNER_WITHDRAWAL",
  "BANK_DEPOSIT",
  "BANK_WITHDRAWAL",
  "CORRECTION",
  "OPENING_FLOAT",
  "CLOSING_ADJUSTMENT",
  "IN",
  "OUT",
] as const;
const entrySources = ["MANUAL", "SALES", "EXPENSE", "DIFFERENCE", "IMPORT", "INTEGRATION"] as const;
const paymentMethods = ["CASH", "CARD", "TRANSFER", "OTHER"] as const;

const defaultFilters: Filters = {
  dayKeyFrom: "",
  dayKeyTo: "",
  type: "",
  source: "",
  paymentMethod: "",
  q: "",
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
  const [belegDocumentId, setBelegDocumentId] = useState("");

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
      paymentMethod: filters.paymentMethod || undefined,
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
        paymentMethod: queryParams.paymentMethod,
        q: queryParams.q,
      }),
    enabled: Boolean(id),
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

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing register id");
      }
      const amount = Math.round(Number(createForm.amountInput) * 100);
      const occurredAt = createForm.occurredAt
        ? new Date(createForm.occurredAt).toISOString()
        : new Date().toISOString();
      const created = await cashManagementApi.createEntry(id, {
        type: createForm.type,
        direction: createForm.direction,
        source: "MANUAL",
        paymentMethod: createForm.paymentMethod,
        description: createForm.description,
        amountCents: amount,
        occurredAt,
      });
      if (createForm.documentId.trim()) {
        await cashManagementApi.attachBeleg(created.entry.id, {
          documentId: createForm.documentId.trim(),
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
      await cashManagementApi.attachBeleg(belegEntryId, {
        documentId: belegDocumentId.trim(),
      });
    },
    onSuccess: async () => {
      if (!id || !belegEntryId) {
        return;
      }
      await invalidateCashRegisterQueries(queryClient, id);
      await queryClient.invalidateQueries({ queryKey: cashKeys.entries.attachments(belegEntryId) });
      setBelegEntryId(null);
      setBelegDocumentId("");
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
  const paymentMethodLabel = (value: string): string =>
    t(`cash.ui.enums.paymentMethod.${value}`, { defaultValue: value });
  const directionLabel = (value: string): string =>
    t(`cash.ui.enums.direction.${value}`, { defaultValue: value });

  const createAmount = Math.round(Number(createForm.amountInput || 0) * 100);
  const projectedBalance =
    register.currentBalanceCents + (createForm.direction === "OUT" ? -createAmount : createAmount);
  const canSaveCreateEntry =
    Boolean(createForm.description.trim()) && !Number.isNaN(createAmount) && createAmount > 0;

  return (
    <>
      <CrudListPageLayout
        title={t("cash.ui.entries.title", { register: register.name })}
        subtitle={t("cash.ui.entries.subtitle")}
        primaryAction={
          <Button onClick={() => setCreateOpen(true)}>{t("cash.ui.entries.newCashEntry")}</Button>
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
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              value={filters.paymentMethod}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, paymentMethod: event.target.value }))
              }
            >
              <option value="">{t("cash.ui.entries.filters.allPayments")}</option>
              {paymentMethods.map((value) => (
                <option key={value} value={value}>
                  {paymentMethodLabel(value)}
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
                  <th className="px-4 py-3 font-medium">{t("cash.ui.entries.table.payment")}</th>
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
                  <tr key={entry.id} className="border-t">
                    <td className="px-4 py-3">{formatDateTime(entry.occurredAt)}</td>
                    <td className="px-4 py-3">{entry.entryNo}</td>
                    <td className="px-4 py-3">{entry.description}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{entryTypeLabel(entry.type)}</Badge>
                    </td>
                    <td className="px-4 py-3">{directionLabel(entry.direction)}</td>
                    <td className="px-4 py-3 text-right">
                      {entry.direction === "OUT" ? "-" : "+"}
                      {formatMoney(entry.amount, undefined, entry.currency)}
                    </td>
                    <td className="px-4 py-3">{paymentMethodLabel(entry.paymentMethod)}</td>
                    <td className="px-4 py-3">{entrySourceLabel(entry.source)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(entry.balanceAfterCents, undefined, entry.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {attachmentCountByEntryId.get(entry.id) ? (
                        <Paperclip className="mx-auto h-4 w-4" />
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
                              setBelegDocumentId("");
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
        entryDirections={entryDirections}
        entryTypes={entryTypes}
        paymentMethods={paymentMethods}
        directionLabel={directionLabel}
        entryTypeLabel={entryTypeLabel}
        paymentMethodLabel={paymentMethodLabel}
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
          }
        }}
        documentId={belegDocumentId}
        setDocumentId={setBelegDocumentId}
        isPending={attachMutation.isPending}
        isError={attachMutation.isError}
        onAttach={() => attachMutation.mutate()}
      />
    </>
  );
}
