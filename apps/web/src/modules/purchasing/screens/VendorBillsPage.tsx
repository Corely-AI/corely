import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Check, Upload, CreditCard, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { purchasingApi } from "@/lib/purchasing-api";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import { EmptyState } from "@/shared/components/EmptyState";

export default function VendorBillsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["vendorBills"],
    queryFn: () => purchasingApi.listVendorBills(),
  });

  const approve = useMutation({
    mutationFn: (id: string) => purchasingApi.approveVendorBill(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorBills"] }),
  });

  const post = useMutation({
    mutationFn: (id: string) => purchasingApi.postVendorBill(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorBills"] }),
  });

  const voidBill = useMutation({
    mutationFn: (id: string) => purchasingApi.voidVendorBill(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendorBills"] }),
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
          {bills.length === 0 ? (
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
                        {bill.billNumber || t("purchasing.statuses.draft")}
                      </td>
                      <td className="px-4 py-3 text-sm">{bill.supplierPartyId}</td>
                      <td className="px-4 py-3">
                        <Badge>{t(`purchasing.statuses.${bill.status.toLowerCase()}`)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatDate(bill.dueDate, i18n.t("common.locale"))}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(bill.totals.totalCents, i18n.t("common.locale"))}
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
                            {bill.status === "DRAFT" && (
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
