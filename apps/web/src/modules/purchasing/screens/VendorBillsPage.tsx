import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Check, Upload, CreditCard, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import {
  LoadingSkeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@corely/ui";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { purchasingApi } from "@/lib/purchasing-api";
import { formatMoney } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";

export default function VendorBillsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendorBills", activeWorkspaceId],
    queryFn: () => purchasingApi.listVendorBills(),
    enabled: Boolean(activeWorkspaceId),
  });

  const approve = useMutation({
    mutationFn: (id: string) => purchasingApi.approveVendorBill(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["vendorBills", activeWorkspaceId] }),
  });

  const post = useMutation({
    mutationFn: (id: string) => purchasingApi.postVendorBill(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["vendorBills", activeWorkspaceId] }),
  });

  const voidBill = useMutation({
    mutationFn: (id: string) => purchasingApi.voidVendorBill(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["vendorBills", activeWorkspaceId] }),
  });

  const bills = data?.items ?? [];

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("purchasing.vendorBills.title")}</h1>
        <div className="flex gap-2">
          <Button variant="accent" onClick={() => navigate("/purchasing/vendor-bills/new")}>
            <Plus className="h-4 w-4" />
            {t("purchasing.vendorBills.new")}
          </Button>
          <Button variant="outline" onClick={() => navigate("/purchasing/copilot")}>
            {t("purchasing.vendorBills.aiCreate")}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton variant="list" label={t("purchasing.invoiceEmail.loading")} />
          ) : isError && !data ? (
            <p className="p-4 text-sm text-destructive" role="alert">
              {t("purchasing.vendorBills.loadFailed")}
            </p>
          ) : bills.length === 0 ? (
            <EmptyState
              title={t("purchasing.vendorBills.emptyTitle")}
              description={t("purchasing.vendorBills.emptyDescription")}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("purchasing.vendorBills.columns.number")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("purchasing.fields.supplier")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("common.status")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("purchasing.fields.dueDate")}
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      {t("common.total")}
                    </th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr
                      key={bill.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        <Link
                          className="hover:underline"
                          to={`/purchasing/vendor-bills/${bill.id}`}
                        >
                          {bill.billNumber || bill.sourceFilename || t("purchasing.statuses.draft")}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm">{bill.supplierPartyId ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge>{t(`purchasing.statuses.${bill.status.toLowerCase()}`)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {bill.dueDate
                          ? new Intl.DateTimeFormat(i18n.t("common.locale"), {
                              dateStyle: "medium",
                              timeZone: "UTC",
                            }).format(new Date(bill.dueDate))
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {bill.currency && /^[A-Z]{3}$/.test(bill.currency)
                          ? formatMoney(
                              bill.totals.totalCents,
                              i18n.t("common.locale"),
                              bill.currency
                            )
                          : "—"}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/purchasing/vendor-bills/${bill.id}`)}
                            >
                              {t("common.view")}
                            </DropdownMenuItem>
                            {bill.status === "DRAFT" && !bill.sourceFilename && (
                              <DropdownMenuItem onClick={() => approve.mutate(bill.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                {t("purchasing.actions.approve")}
                              </DropdownMenuItem>
                            )}
                            {bill.status === "APPROVED" && (
                              <DropdownMenuItem onClick={() => post.mutate(bill.id)}>
                                <Upload className="mr-2 h-4 w-4" />
                                {t("purchasing.actions.post")}
                              </DropdownMenuItem>
                            )}
                            {bill.status === "POSTED" && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/purchasing/vendor-bills/${bill.id}/pay`)}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                {t("purchasing.actions.recordPayment")}
                              </DropdownMenuItem>
                            )}
                            {bill.status !== "VOID" && (
                              <DropdownMenuItem onClick={() => voidBill.mutate(bill.id)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                {t("purchasing.actions.void")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
