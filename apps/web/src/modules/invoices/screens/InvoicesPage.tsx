import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Copy, Download, Edit, FileText, Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { invoicesApi } from "@/lib/invoices-api";
import { customersApi } from "@/lib/customers-api";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";
import { Badge } from "@corely/ui";
import { Button } from "@corely/ui";
import { Checkbox } from "@corely/ui";

import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog } from "@/shared/crud";
import {
  ListToolbar,
  ActiveFilterChips,
  useListUrlState,
  FilterPanel,
  type FilterFieldDef,
} from "@/shared/list-kit";
import { invoiceQueryKeys } from "../queries";
import { workspaceQueryKeys } from "@/shared/workspaces/workspace-query-keys";
import type { InvoiceStatus } from "@/shared/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@corely/ui";

export default function InvoicesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";
  const queryClient = useQueryClient();
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // URL State
  const [state, setUrlState] = useListUrlState(
    {
      pageSize: 20,
      sort: "createdAt:desc", // Default sort
    },
    { storageKey: "invoices-list-v1" }
  );

  // Queries
  const { data: listData, isLoading } = useQuery({
    queryKey: [...invoiceQueryKeys.list(), state],
    queryFn: () => invoicesApi.listInvoices(state),
    placeholderData: keepPreviousData,
  });

  const { data: customersData } = useQuery({
    queryKey: workspaceQueryKeys.customers.list(),
    queryFn: () => customersApi.listCustomers(),
  });

  const invoices = listData?.items ?? [];
  const pageInfo = listData?.pageInfo;
  const customers = customersData?.customers ?? [];

  const getCustomerName = (customerPartyId: string) =>
    customers.find((c) => c.id === customerPartyId)?.displayName || "Unknown";

  // Filter Fields
  const filterFields = React.useMemo<FilterFieldDef[]>(() => {
    const fields: FilterFieldDef[] = [
      {
        key: "status",
        label: t("invoices.statusLabel"),
        type: "select",
        options: ["DRAFT", "ISSUED", "PAID", "OVERDUE", "CANCELLED"].map((s) => ({
          label: t(`invoices.statuses.${s.toLowerCase()}`),
          value: s,
        })),
      },
      { key: "number", label: t("invoices.invoiceNumber"), type: "text" },
      // { key: "totalCents", label: "Amount (cents)", type: "number" }, // TODO: Better handling
      { key: "issuedAt", label: t("invoices.date"), type: "date" },
    ];

    if (customers.length > 0) {
      fields.push({
        key: "customerPartyId",
        label: t("invoices.client"),
        type: "select",
        options: customers.map((c) => ({ label: c.displayName, value: c.id })),
      });
    }

    return fields;
  }, [t, customers]);

  // Mutations
  const duplicateInvoice = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { invoice } = await invoicesApi.getInvoice(invoiceId);
      return invoicesApi.createInvoice({
        customerPartyId: invoice.customerPartyId,
        currency: invoice.currency,
        invoiceDate: invoice.invoiceDate ?? undefined,
        dueDate: invoice.dueDate ?? undefined,
        notes: invoice.notes ?? undefined,
        terms: invoice.terms ?? undefined,
        lineItems: invoice.lineItems.map((item) => ({
          description: item.description,
          qty: item.qty,
          unitPriceCents: item.unitPriceCents,
        })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.list() });
      toast.success("Invoice duplicated");
    },
    onError: (error) => {
      console.error("Duplicate invoice failed", error);
      toast.error("Failed to duplicate invoice");
    },
  });

  const emailInvoice = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.sendInvoice(invoiceId),
    onSuccess: () => toast.success("Invoice email sent"),
    onError: (error) => {
      console.error("Send invoice failed", error);
      toast.error("Failed to send invoice");
    },
  });

  const cancelInvoice = useMutation({
    mutationFn: (invoiceId: string) => invoicesApi.cancelInvoice(invoiceId, "Soft delete"),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.list() });
      toast.success("Invoice deleted (soft)");
    },
    onError: (error) => {
      console.error("Delete invoice failed", error);
      toast.error("Failed to delete invoice");
    },
  });

  const downloadPdf = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      if (status === "DRAFT") {
        await invoicesApi.finalizeInvoice(invoiceId);
      }
      return invoicesApi.downloadInvoicePdf(invoiceId, { forceRegenerate: true });
    },
    onSuccess: (data, variables) => {
      if (variables.status === "DRAFT") {
        void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.list() });
        toast.success(t("invoices.issued"));
      }
      if (data.status === "READY" && data.downloadUrl) {
        window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
        return;
      }
      toast.info("PDF is being prepared", {
        description: "We started generating the PDF. Please try again in a moment.",
      });
    },
    onError: (error) => {
      console.error("Download PDF failed", error);
      toast.error("Failed to download invoice PDF");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => invoicesApi.cancelInvoice(id, "Bulk delete")));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: invoiceQueryKeys.list() });
      toast.success("Invoices deleted");
      setSelectedIds(new Set());
    },
    onError: () => toast.error("Failed to delete invoices"),
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected = invoices.length > 0 && invoices.every((i) => selectedIds.has(i.id));

  // Renderers
  return (
    <CrudListPageLayout
      title={t("invoices.title")}
      primaryAction={
        <Button
          variant="accent"
          data-testid="create-invoice-button"
          onClick={() => navigate("/invoices/new")}
        >
          <Plus className="h-4 w-4" />
          {t("invoices.createInvoice")}
        </Button>
      }
      toolbar={
        <ListToolbar
          search={state.q}
          onSearchChange={(v) => setUrlState({ q: v, page: 1 })}
          sort={state.sort}
          onSortChange={(v) => setUrlState({ sort: v })}
          sortOptions={[
            { label: "Date (Newest)", value: "issuedAt:desc" },
            { label: "Date (Oldest)", value: "issuedAt:asc" },
            { label: "Amount (High-Low)", value: "totalCents:desc" },
            { label: "Amount (Low-High)", value: "totalCents:asc" },
            { label: "Number", value: "number:desc" },
          ]}
          onFilterClick={() => setIsFilterOpen(true)}
          filterCount={state.filters?.length}
        />
      }
      filters={
        (state.filters?.length ?? 0) > 0 ? (
          <ActiveFilterChips
            filters={state.filters ?? []}
            onRemove={(f) => {
              const newFilters = state.filters?.filter((x) => x !== f) ?? [];
              setUrlState({ filters: newFilters, page: 1 });
            }}
            onClearAll={() => setUrlState({ filters: [], page: 1 })}
          />
        ) : undefined
      }
    >
      {invoices.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title={t("invoices.noInvoices")}
          description={t("invoices.noInvoicesDescription")}
          action={
            <Button variant="outline" onClick={() => setUrlState({ q: "", filters: [] })}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {selectedIds.size > 0 ? (
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40 rounded-t-md">
              <div className="text-sm text-muted-foreground">{selectedIds.size} selected</div>
              <ConfirmDeleteDialog
                trigger={
                  <Button variant="destructive" size="sm" disabled={bulkDeleteMutation.isPending}>
                    Delete selected
                  </Button>
                }
                title="Delete selected invoices"
                description="This will cancel and soft-delete the selected invoices."
                isLoading={bulkDeleteMutation.isPending}
                onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              />
            </div>
          ) : null}
          <div className="rounded-md border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedIds(new Set(invoices.map((i) => i.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t("invoices.invoiceNumber")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t("invoices.client")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t("invoices.date")}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    {t("invoices.statusLabel")}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                    {t("invoices.amount")}
                  </th>
                  <th className="w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {/* Loader or items */}
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td colSpan={7} className="h-16 animate-pulse bg-muted/20" />
                      </tr>
                    ))
                  : invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        data-testid={`invoice-row-${invoice.id}`}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selectedIds.has(invoice.id)}
                            onCheckedChange={() => toggleSelection(invoice.id)}
                            aria-label={`Select invoice ${invoice.id}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {invoice.number || "Draft"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {getCustomerName(invoice.customerPartyId)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDate(invoice.issuedAt || invoice.createdAt, locale)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={invoice.status.toLowerCase() as InvoiceStatus}
                            data-testid={`invoice-status-${invoice.status}`}
                          >
                            {t(`invoices.statuses.${invoice.status.toLowerCase()}`)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatMoney(invoice.totals.totalCents, locale)}
                        </td>
                        <td className="px-2 py-3">
                          <CrudRowActions
                            primaryAction={{
                              label: "View",
                              href: `/invoices/${invoice.id}`,
                              "data-testid": `view-invoice-${invoice.id}`,
                            }}
                            secondaryActions={[
                              {
                                label: "Edit",
                                href: `/invoices/${invoice.id}/edit`, // Assuming edit route
                                icon: <Edit className="h-4 w-4" />,
                              },
                              {
                                label: "Duplicate",
                                onClick: () => duplicateInvoice.mutate(invoice.id),
                                icon: <Copy className="h-4 w-4" />,
                              },
                              {
                                label: "Email",
                                onClick: () => emailInvoice.mutate(invoice.id),
                                icon: <Mail className="h-4 w-4" />,
                              },
                              {
                                label: "Download PDF",
                                onClick: () =>
                                  downloadPdf.mutate({
                                    invoiceId: invoice.id,
                                    status: invoice.status,
                                  }),
                                icon: <Download className="h-4 w-4" />,
                                disabled: downloadPdf.isPending,
                              },
                              {
                                label: "Delete",
                                onClick: () => cancelInvoice.mutate(invoice.id),
                                icon: <Trash2 className="h-4 w-4" />,
                                destructive: true,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pageInfo && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => state.page > 1 && setUrlState({ page: state.page - 1 })}
                    // disabled={state.page <= 1} // Check standard component prop
                    className={
                      state.page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink isActive>{state.page}</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => pageInfo.hasNextPage && setUrlState({ page: state.page + 1 })}
                    className={
                      !pageInfo.hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        onApply={(newFilters) => setUrlState({ filters: newFilters, page: 1 })}
        fields={filterFields}
      />
    </CrudListPageLayout>
  );
  // End of component
}
