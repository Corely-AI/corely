import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, RefreshCcw } from "lucide-react";
import { Button, Card, CardContent, Input } from "@corely/ui";
import { toast } from "sonner";
import { classesApi } from "@/lib/classes-api";
import { customersApi } from "@/lib/customers-api";
import { classBillingKeys } from "../queries";
import { formatMoney } from "@/shared/lib/formatters";

const toMonthValue = (date: Date) => date.toISOString().slice(0, 7);

export default function ClassesBillingPage() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(toMonthValue(new Date()));
  const [resultSummary, setResultSummary] = useState<string | null>(null);

  const {
    data: preview,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: classBillingKeys.preview(month),
    queryFn: () => classesApi.getBillingPreview(month),
  });

  const { data: customersData } = useQuery({
    queryKey: ["customers", "options"],
    queryFn: () => customersApi.listCustomers({ pageSize: 200 }),
  });

  const { data: groupsData } = useQuery({
    queryKey: ["class-groups", "options"],
    queryFn: () => classesApi.listClassGroups({ page: 1, pageSize: 200 }),
  });

  const nameByClient = useMemo(() => {
    const map = new Map<string, string>();
    (customersData?.customers ?? []).forEach((customer) => {
      map.set(customer.id, customer.displayName || customer.id);
    });
    return map;
  }, [customersData]);

  const nameByGroup = useMemo(() => {
    const map = new Map<string, string>();
    (groupsData?.items ?? []).forEach((group) => {
      map.set(group.id, group.name);
    });
    return map;
  }, [groupsData]);

  const createRun = useMutation({
    mutationFn: async () =>
      classesApi.createBillingRun({
        month,
        createInvoices: true,
        sendInvoices: false,
      }),
    onSuccess: async (data) => {
      toast.success(`Created ${data.invoiceIds.length} invoices`);
      setResultSummary(`Created ${data.invoiceIds.length} invoices for ${month}`);
      await queryClient.invalidateQueries({ queryKey: classBillingKeys.preview(month) });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to create billing run"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xl font-semibold">Class Billing</div>
          <div className="text-sm text-muted-foreground">
            Preview tuition and create invoices for the selected month.
          </div>
        </div>
        <Button
          variant="accent"
          onClick={() => createRun.mutate()}
          disabled={createRun.isPending || !month}
        >
          <FileText className="h-4 w-4" />
          Create invoices for month
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-sm font-medium">Month</div>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40"
            />
            <Button
              variant="ghost"
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: classBillingKeys.preview(month) })
              }
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {resultSummary ? (
            <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
              {resultSummary}
            </div>
          ) : null}

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading preview...</div>
          ) : isError ? (
            <div className="text-sm text-destructive">
              {(error as Error)?.message || "Failed to load preview"}
            </div>
          ) : preview?.items?.length ? (
            <div className="space-y-4">
              {preview.items.map((item) => (
                <div key={item.payerClientId} className="rounded-md border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {nameByClient.get(item.payerClientId) ?? item.payerClientId}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.totalSessions} sessions •{" "}
                      {formatMoney(item.totalAmountCents, undefined, item.currency)}
                    </div>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2">
                            Class group
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2">
                            Sessions
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2">
                            Price
                          </th>
                          <th className="text-left text-xs font-medium text-muted-foreground px-2 py-2">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.lines.map((line) => (
                          <tr
                            key={line.classGroupId}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-2 py-2 text-sm">
                              {nameByGroup.get(line.classGroupId) ?? line.classGroupId}
                            </td>
                            <td className="px-2 py-2 text-sm text-muted-foreground">
                              {line.sessions}
                            </td>
                            <td className="px-2 py-2 text-sm text-muted-foreground">
                              {formatMoney(line.priceCents, undefined, item.currency)}
                            </td>
                            <td className="px-2 py-2 text-sm font-medium">
                              {formatMoney(line.amountCents, undefined, item.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No billable attendance for this month.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
