import React from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Clock,
  Receipt,
  ArrowUpRight,
  MessageSquare,
  FileText,
  Sparkles,
  Users,
  ShoppingCart,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { formatMoney, formatRelativeTime } from "@corely/web-shared/shared/lib/formatters";
import { CardSkeleton } from "@corely/web-shared/shared/components/Skeleton";
import { invoicesApi } from "@corely/web-shared/lib/invoices-api";
import { customersApi } from "@corely/web-shared/lib/customers-api";
import { expensesApi } from "@corely/web-shared/lib/expenses-api";
import { useWorkspaceConfig } from "@corely/web-shared/shared/workspaces/workspace-config-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import { workspaceQueryKeys } from "@corely/web-shared/shared/workspaces/workspace-query-keys";
import { getPortalUrl } from "@corely/web-shared/shared/lib/portal-url";

const invoiceStatusToBadgeVariant = (
  status: string
): React.ComponentProps<typeof Badge>["variant"] => {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "ISSUED":
      return "issued";
    case "SENT":
      return "sent";
    case "PAID":
      return "paid";
    case "OVERDUE":
      return "overdue";
    case "CANCELLED":
      return "outline";
    default:
      return "muted";
  }
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-DE";

  const { config, hasCapability } = useWorkspaceConfig();
  const { activeWorkspace } = useWorkspace();
  const portalUrl = getPortalUrl(activeWorkspace?.slug);
  const terminology = config?.terminology ?? {
    partyLabel: "Client",
    partyLabelPlural: "Clients",
    invoiceLabel: "Invoice",
    invoiceLabelPlural: "Invoices",
    quoteLabel: "Quote",
    quoteLabelPlural: "Quotes",
    projectLabel: "Project",
    projectLabelPlural: "Projects",
    expenseLabel: "Expense",
    expenseLabelPlural: "Expenses",
  };

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: workspaceQueryKeys.invoices.list(),
    queryFn: () => invoicesApi.listInvoices(),
  });

  const invoices = invoicesData?.items ?? [];

  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: workspaceQueryKeys.customers.list(),
    queryFn: () => customersApi.listCustomers(),
  });

  const { data: expensesData, isLoading: isLoadingExpenses } = useQuery({
    queryKey: workspaceQueryKeys.expenses.list(),
    queryFn: () => expensesApi.listExpenses(),
  });

  const expenses = expensesData?.items ?? [];
  const customers = customersData?.customers || [];
  const isLoading = isLoadingInvoices || isLoadingCustomers || isLoadingExpenses;

  const dashboard = React.useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const computeRevenueForRange = (start: Date, end: Date) => {
      return invoices.reduce((sum, inv) => {
        const payments = inv.payments ?? [];
        if (payments.length > 0) {
          const paidInRange = payments.filter((payment) => {
            const paidDate = new Date(payment.paidAt);
            return paidDate >= start && paidDate < end;
          });
          return (
            sum + paidInRange.reduce((paidSum, payment) => paidSum + (payment.amountCents || 0), 0)
          );
        }

        if (inv.status !== "PAID") {
          return sum;
        }

        const paidDate = new Date(inv.updatedAt);
        if (paidDate >= start && paidDate < end) {
          return sum + (inv.totals?.totalCents || 0);
        }

        return sum;
      }, 0);
    };

    const revenueThisMonthCents = computeRevenueForRange(thisMonthStart, nextMonthStart);
    const revenueLastMonthCents = computeRevenueForRange(lastMonthStart, thisMonthStart);

    const revenueMoMPercent =
      revenueLastMonthCents === 0
        ? null
        : ((revenueThisMonthCents - revenueLastMonthCents) / revenueLastMonthCents) * 100;

    const outstandingInvoices = invoices.filter(
      (inv) => inv.status === "ISSUED" || inv.status === "SENT"
    );
    const outstandingInvoicesCents = outstandingInvoices.reduce(
      (sum, inv) => sum + (inv.totals?.totalCents || 0),
      0
    );

    const expensesThisMonthCents = expenses
      .filter((exp) => {
        const expDate = new Date(exp.expenseDate || exp.createdAt);
        return expDate >= thisMonthStart && expDate < nextMonthStart;
      })
      .reduce((sum, exp) => sum + (exp.totalAmountCents || 0), 0);

    const recentInvoices = [...invoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);

    const recentExpenses = [...expenses]
      .sort((a, b) => {
        const dateA = new Date(a.expenseDate || a.createdAt).getTime();
        const dateB = new Date(b.expenseDate || b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 4);

    return {
      revenueThisMonthCents,
      outstandingInvoicesCents,
      outstandingInvoicesCount: outstandingInvoices.length,
      expensesThisMonthCents,
      recentInvoices,
      recentExpenses,
      revenueMoMPercent,
    };
  }, [invoices, expenses]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-h1 text-foreground">{t("dashboard.welcome")}</h1>
          <p className="text-muted-foreground mt-1">{t("common.tagline")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="accent" asChild>
            <Link to="/assistant">
              <Sparkles className="h-4 w-4" />
              {t("dashboard.openAssistant")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revenue */}
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-success/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.revenueThisMonth")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard.revenueThisMonthCents, locale)}
            </div>
            {dashboard.revenueMoMPercent !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                {`${dashboard.revenueMoMPercent >= 0 ? "+" : ""}${Math.round(
                  dashboard.revenueMoMPercent
                )}% ${t("dashboard.fromLastMonth")}`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.outstandingInvoices")}
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard.outstandingInvoicesCents, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.outstandingInvoicesCount} {t("dashboard.invoicesPending")}
            </p>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card variant="elevated" className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.expensesThisMonth")}
            </CardTitle>
            <Receipt className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatMoney(dashboard.expensesThisMonthCents, locale)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.recentExpenses.length} {t("dashboard.expensesCount")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Capability-driven UI */}
      <div>
        <h2 className="text-h3 text-foreground mb-4">{t("dashboard.quickActions")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Always show: Add expense with AI */}
          {hasCapability("ai.copilot") && (
            <Link to="/assistant">
              <Card variant="interactive" className="group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Receipt className="h-6 w-6 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{t("dashboard.addExpense")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("dashboard.uploadReceipt")}
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-accent transition-colors" />
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Always show: Create invoice */}
          <Link to="/invoices">
            <Card variant="interactive" className="group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                  <FileText className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{t("dashboard.createInvoice")}</div>
                  <div className="text-sm text-muted-foreground">
                    {hasCapability("ai.copilot")
                      ? t("dashboard.generateWithAi")
                      : t("dashboard.createNew")}
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-success transition-colors" />
              </CardContent>
            </Card>
          </Link>

          {/* Conditional: Show quotes for company mode, assistant for freelancer */}
          {hasCapability("sales.quotes") ? (
            <Link to="/sales/quotes">
              <Card variant="interactive" className="group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                    <ShoppingCart className="h-6 w-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{t("dashboard.createQuote")}</div>
                    <div className="text-sm text-muted-foreground">
                      For {terminology.partyLabel.toLowerCase()}
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-warning transition-colors" />
                </CardContent>
              </Card>
            </Link>
          ) : (
            hasCapability("ai.copilot") && (
              <Link to="/assistant">
                <Card variant="interactive" className="group">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <MessageSquare className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {t("dashboard.openAssistant")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("dashboard.askAnything")}
                      </div>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            )
          )}

          {/* Conditional: Team management for multi-user companies */}
          {hasCapability("workspace.multiUser") && (
            <Link to="/settings/members">
              <Card variant="interactive" className="group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
                    <Users className="h-6 w-6 text-info" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{t("dashboard.manageTeam")}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("dashboard.inviteMembers")}
                    </div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-info transition-colors" />
                </CardContent>
              </Card>
            </Link>
          )}

          {/* Student & Guardian Portal */}
          {portalUrl && (
            <a href={portalUrl} target="_blank" rel="noopener noreferrer">
              <Card variant="interactive" className="group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <GraduationCap className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">Student Portal</div>
                    <div className="text-sm text-muted-foreground">View as student or guardian</div>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                </CardContent>
              </Card>
            </a>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t("invoices.title")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/invoices">{t("common.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("dashboard.noInvoices")}
                </p>
              ) : (
                dashboard.recentInvoices.map((invoice) => {
                  const customer = customers.find((c) => c.id === invoice.customerPartyId);
                  return (
                    <Link
                      key={invoice.id}
                      to={`/invoices/${invoice.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {invoice.number || "Draft"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {customer?.displayName || "Unknown Customer"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          {formatMoney(invoice.totals?.totalCents || 0, locale)}
                        </div>
                        <Badge
                          variant={invoiceStatusToBadgeVariant(invoice.status)}
                          className="text-xs"
                        >
                          {invoice.status}
                        </Badge>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card variant="default">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t("expenses.title")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/expenses">{t("common.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("dashboard.noExpenses")}
                </p>
              ) : (
                dashboard.recentExpenses.map((expense) => (
                  <Link
                    key={expense.id}
                    to={`/expenses`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {expense.merchantName || "Unknown Merchant"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {expense.category || "Uncategorized"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">
                        {formatMoney(expense.totalAmountCents || 0, locale)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRelativeTime(expense.expenseDate || expense.createdAt, locale)}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
