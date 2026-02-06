import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, RefreshCcw } from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@corely/ui";
import { toast } from "sonner";
import { classesApi } from "@/lib/classes-api";
import { customersApi } from "@/lib/customers-api";
import { CrudListPageLayout } from "@/shared/crud";
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
    <CrudListPageLayout
      title="Class Billing"
      subtitle="Preview tuition and create invoices for the selected month."
      primaryAction={
        <Button
          variant="accent"
          onClick={() => createRun.mutate()}
          disabled={createRun.isPending || !month}
        >
          <FileText className="h-4 w-4" />
          Create invoices for month
        </Button>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Billing Month
            </span>
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-[180px]"
            />
          </div>
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
      }
    >
      <div className="p-6 space-y-6">
        {resultSummary ? (
          <div className="rounded-lg border border-success/20 bg-success/5 px-4 py-3 text-sm text-success flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {resultSummary}
          </div>
        ) : null}

        {preview && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-4 py-3 bg-muted/30 rounded-lg border border-border text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Billing Strategy:</span>
              <Badge variant="outline" className="bg-background/50">
                {preview.billingMonthStrategy === "PREPAID_CURRENT_MONTH" ? "Prepaid" : "Arrears"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Billing Basis:</span>
              <Badge variant="outline" className="bg-background/50">
                {preview.billingBasis === "SCHEDULED_SESSIONS"
                  ? "Scheduled Sessions"
                  : "Attended Sessions"}
              </Badge>
            </div>
            {preview.billingBasis === "ATTENDED_SESSIONS" && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium ml-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Only sessions marked as "DONE" with attendance are billable
              </div>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
            <RefreshCcw className="h-8 w-8 animate-spin opacity-20" />
            <p className="text-sm">Loading billing preview...</p>
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {(error as Error)?.message || "Failed to load preview"}
          </div>
        ) : preview?.items?.length ? (
          <div className="grid gap-6 lg:grid-cols-1">
            {preview.items.map((item) => (
              <div
                key={item.payerClientId}
                className="rounded-lg border border-border bg-card overflow-hidden shadow-sm"
              >
                <div className="bg-muted/30 px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {nameByClient.get(item.payerClientId) ?? item.payerClientId}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Payer ID: {item.payerClientId}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-sm font-bold text-foreground">
                      {formatMoney(item.totalAmountCents, undefined, item.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.totalSessions} sessions total
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/10">
                        <th className="text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          Class Group
                        </th>
                        <th className="text-center text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          Sessions
                        </th>
                        <th className="text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          Price / Session
                        </th>
                        <th className="text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground px-4 py-2">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {item.lines.map((line) => (
                        <tr key={line.classGroupId} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium">
                            {nameByGroup.get(line.classGroupId) ?? line.classGroupId}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-muted-foreground italic">
                            {line.sessions}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                            {formatMoney(line.priceCents, undefined, item.currency)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold">
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
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-border rounded-xl">
            <FileText className="h-10 w-10 text-muted-foreground opacity-20 mb-3" />
            <h3 className="text-lg font-medium text-foreground">No billable sessions</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              There are no confirmed sessions for the selected month that haven't been billed yet.
              {preview?.billingBasis === "ATTENDED_SESSIONS" && (
                <span className="block mt-4 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-md border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-medium">
                  Tip: In "Attended Sessions" mode, you must mark sessions as DONE and record
                  attendance before they can be billed.
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </CrudListPageLayout>
  );
}
