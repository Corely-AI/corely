import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@corely/ui";
import { formatDateTime, formatMoney } from "@/shared/lib/formatters";
import { cashManagementApi } from "@/lib/cash-management-api";
import { cashKeys } from "../queries";

export function CashRegisterDetailScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const registerQuery = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash-registers", "missing-id"],
    queryFn: () => cashManagementApi.getRegister(id as string),
    enabled: Boolean(id),
  });

  const entriesQuery = useQuery({
    queryKey: id
      ? cashKeys.entries.list({ registerId: id, preview: true })
      : ["cash-entries", "missing-id"],
    queryFn: async () => {
      const result = await cashManagementApi.listEntries(id as string);
      return {
        entries: result.entries.slice(0, 8),
      };
    },
    enabled: Boolean(id),
  });

  const closesQuery = useQuery({
    queryKey: id
      ? cashKeys.dayCloses.list({
          registerId: id,
          dayKeyFrom: "0000-01-01",
        })
      : ["cash-day-closes", "missing-id"],
    queryFn: () => cashManagementApi.listDayCloses(id as string),
    enabled: Boolean(id),
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
  const entries = entriesQuery.data?.entries ?? [];
  const closes = closesQuery.data?.closes ?? [];
  const lastClosed = closes
    .filter((close) => close.status === "SUBMITTED")
    .sort((a, b) => (a.dayKey < b.dayKey ? 1 : -1))[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{register.name}</h1>
          <p className="text-sm text-muted-foreground">
            {register.location ?? t("cash.ui.common.noLocation")} · {register.currency}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/cash/registers/${id}/entries`}>
              {t("cash.ui.registerDetail.newCashEntry")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link
              to={`/cash/registers/${id}/day-close?day=${new Date().toISOString().slice(0, 10)}`}
            >
              {t("cash.ui.registerDetail.closeDay")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/cash/registers/${id}/exports`}>{t("cash.ui.registerDetail.export")}</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to={`/cash/registers/${id}/edit`}>{t("cash.ui.registerDetail.edit")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("cash.ui.registerDetail.currentBalance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(register.currentBalanceCents, undefined, register.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("cash.ui.registerDetail.lastClosedDay")}</CardTitle>
          </CardHeader>
          <CardContent>
            {lastClosed ? (
              <span>{lastClosed.dayKey}</span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {t("cash.ui.registerDetail.noSubmittedClose")}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("cash.ui.registerDetail.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="entries">
            {t("cash.ui.registerDetail.tabs.entriesPreview")}
          </TabsTrigger>
          <TabsTrigger value="activity">
            {t("cash.ui.registerDetail.tabs.activityAudit")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardContent className="space-y-2 pt-6 text-sm">
              <p>
                {t("cash.ui.registerDetail.registerId")}:{" "}
                <span className="font-mono">{register.id}</span>
              </p>
              <p>
                {t("cash.ui.registerDetail.negativeBalancePolicy")}:{" "}
                <Badge variant={register.disallowNegativeBalance ? "destructive" : "outline"}>
                  {register.disallowNegativeBalance
                    ? t("cash.ui.registerDetail.policyBlocked")
                    : t("cash.ui.registerDetail.policyAllowed")}
                </Badge>
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="entries">
          <Card>
            <CardContent className="pt-6">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("cash.ui.registerDetail.noEntriesYet")}
                </p>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-muted-foreground">
                          #{entry.entryNo} · {formatDateTime(entry.occurredAt)}
                        </p>
                      </div>
                      <p className={entry.direction === "OUT" ? "text-red-600" : "text-green-600"}>
                        {entry.direction === "OUT" ? "-" : "+"}
                        {formatMoney(entry.amount, undefined, entry.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Button variant="outline" asChild>
                  <Link to={`/cash/registers/${id}/entries`}>
                    {t("cash.ui.registerDetail.openFullEntries")}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {t("cash.ui.registerDetail.activityPrefix")}{" "}
              <strong>{t("cash.ui.registerDetail.auditPack")}</strong>{" "}
              {t("cash.ui.registerDetail.activitySuffix")}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
