import React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, MoreHorizontal, Check, Upload, CreditCard, XCircle } from "lucide-react";
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
        <h1 className="text-h1 text-foreground">Vendor Bills</h1>
        <div className="flex gap-2">
          <Button variant="accent" onClick={() => navigate("/purchasing/vendor-bills/new")}>
            <Plus className="h-4 w-4" />
            New Bill
          </Button>
          <Button variant="outline" onClick={() => navigate("/purchasing/copilot")}>
            AI: Create Bill from text
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {bills.length === 0 ? (
            <EmptyState title="No vendor bills" description="Capture your first bill." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Bill #
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Supplier
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Due Date
                    </th>
                    <th className="text-right text-sm font-medium text-muted-foreground px-4 py-3">
                      Total
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
                        {bill.billNumber || "Draft"}
                      </td>
                      <td className="px-4 py-3 text-sm">{bill.supplierPartyId}</td>
                      <td className="px-4 py-3">
                        <Badge>{bill.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(bill.dueDate, "en-US")}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {formatMoney(bill.totals.totalCents, "en-US")}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/purchasing/vendor-bills/${bill.id}`)}
                            >
                              View
                            </DropdownMenuItem>
                            {bill.status === "DRAFT" && (
                              <DropdownMenuItem onClick={() => approve.mutate(bill.id)}>
                                <Check className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {bill.status === "APPROVED" && (
                              <DropdownMenuItem onClick={() => post.mutate(bill.id)}>
                                <Upload className="mr-2 h-4 w-4" />
                                Post Bill
                              </DropdownMenuItem>
                            )}
                            {bill.status === "POSTED" && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/purchasing/vendor-bills/${bill.id}/pay`)}
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Record Payment
                              </DropdownMenuItem>
                            )}
                            {bill.status !== "VOID" && (
                              <DropdownMenuItem onClick={() => voidBill.mutate(bill.id)}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Void
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
