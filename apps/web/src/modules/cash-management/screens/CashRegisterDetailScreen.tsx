import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Minus, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@corely/ui";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { formatMoney, formatDate } from "@/shared/lib/formatters";
import { cashManagementApi } from "@/lib/cash-management-api";
import { cashKeys } from "../queries";
import { toast } from "sonner";
import { CashEntryType, CashEntrySourceType } from "@corely/contracts";
import { useTranslation } from "react-i18next";

export function CashRegisterDetailScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("entries");

  // Dialog States
  const [entryType, setEntryType] = useState<CashEntryType | null>(null); // 'IN' or 'OUT'
  const [paramAmount, setParamAmount] = useState("");
  const [paramDesc, setParamDesc] = useState("");

  const { data: regData, isLoading: regLoading } = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash", "registers", "none"],
    queryFn: () => (id ? cashManagementApi.getRegister(id) : Promise.reject("No ID")),
    enabled: !!id,
  });

  const { data: entriesData } = useQuery({
    queryKey: id ? cashKeys.entries.list(id, {}) : ["cash", "entries", "none"],
    queryFn: () => (id ? cashManagementApi.listEntries(id, {}) : Promise.reject("No ID")),
    enabled: !!id,
  });

  const { data: closesData } = useQuery({
    queryKey: id ? cashKeys.dailyCloses.list(id, {}) : ["cash", "daily-closes", "none"],
    queryFn: () => (id ? cashManagementApi.listDailyCloses(id, {}) : Promise.reject("No ID")),
    enabled: !!id,
  });

  const createEntryMutation = useMutation({
    mutationFn: (vars: { type: CashEntryType; amountCents: number; desc: string }) => {
      if (!id) {
        throw new Error("No register ID");
      }
      return cashManagementApi.createEntry(id, {
        registerId: id,
        type: vars.type,
        amountCents: vars.amountCents,
        sourceType: CashEntrySourceType.MANUAL,
        description: vars.desc,
      });
    },
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: cashKeys.registers.detail(id) });
      await queryClient.invalidateQueries({ queryKey: cashKeys.entries.list(id, {}) });
      setEntryType(null);
      setParamAmount("");
      setParamDesc("");
      toast.success(t("cash.detail.entryAdded"));
    },
    onError: (err: any) => {
      toast.error(
        `${t("cash.detail.entryAddFailed")}: ${err.response?.data?.message || err.message}`
      );
    },
  });

  if (!id) {
    return null;
  }

  const handleCreateEntry = () => {
    if (!entryType || !paramAmount || !paramDesc) {
      return;
    }
    const cents = Math.round(parseFloat(paramAmount) * 100);
    if (isNaN(cents) || cents <= 0) {
      toast.error(t("cash.detail.invalidAmount"));
      return;
    }
    createEntryMutation.mutate({ type: entryType, amountCents: cents, desc: paramDesc });
  };

  const register = regData?.register;
  const entries = entriesData?.entries ?? [];
  const closes = closesData?.closes ?? [];

  if (regLoading) {
    return <div className="p-6">{t("common.loading")}</div>;
  }
  if (!register) {
    return <div className="p-6">{t("errors.pageNotFound")}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/cash-registers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{register.name}</h1>
          <p className="text-muted-foreground">
            {register.location || t("cash.registers.noLocation")}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to={`/cash-registers/${id}/daily-close`}>
              <Lock className="mr-2 h-4 w-4" />
              {t("cash.dailyClose.title")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("cash.registers.currentBalance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatMoney(register.currentBalanceCents, register.currency)}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {t("dashboard.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button
              onClick={() => setEntryType(CashEntryType.IN)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("cash.detail.cashIn")}
            </Button>
            <Button
              onClick={() => setEntryType(CashEntryType.OUT)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Minus className="mr-2 h-4 w-4" />
              {t("cash.detail.cashOut")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="closes">{t("cash.detail.dailyCloses")}</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3 font-medium">{t("common.date")}</th>
                    <th className="p-3 font-medium">{t("common.description")}</th>
                    <th className="p-3 font-medium">{t("common.type")}</th>
                    <th className="p-3 font-medium text-right">{t("common.amount")}</th>
                    <th className="p-3 font-medium">{t("cash.detail.updatedBalance")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="p-3">{formatDate(entry.createdAt, "en-US")}</td>
                      <td className="p-3">
                        <div className="font-medium">{entry.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.sourceType}{" "}
                          {entry.referenceId && `Ref: ${entry.referenceId.slice(0, 8)}`}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={entry.type === "IN" ? "default" : "secondary"}>
                          {entry.type}
                        </Badge>
                      </td>
                      <td
                        className={`p-3 text-right font-medium ${entry.type === "OUT" ? "text-red-600" : "text-green-600"}`}
                      >
                        {entry.type === "OUT" ? "-" : "+"}
                        {formatMoney(entry.amountCents, register.currency)}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs italic">
                        {/* Running balance is hard without full history or backend support, omitting for now */}
                        -
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {t("cash.detail.noEntriesFound")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="closes">
          <Card>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-3">{t("cash.dailyClose.businessDate")}</th>
                    <th className="p-3">{t("common.status")}</th>
                    <th className="p-3 text-right">{t("cash.dailyClose.expectedBalance")}</th>
                    <th className="p-3 text-right">{t("cash.dailyClose.countedBalance")}</th>
                    <th className="p-3 text-right">{t("cash.dailyClose.difference")}</th>
                  </tr>
                </thead>
                <tbody>
                  {closes.map((close) => (
                    <tr key={close.id} className="border-b hover:bg-muted/10">
                      <td className="p-3 font-medium">{close.businessDate}</td>
                      <td className="p-3">
                        <Badge variant="outline">{close.status}</Badge>
                      </td>
                      <td className="p-3 text-right">
                        {formatMoney(close.expectedBalanceCents, register.currency)}
                      </td>
                      <td className="p-3 text-right">
                        {formatMoney(close.countedBalanceCents, register.currency)}
                      </td>
                      <td
                        className={`p-3 text-right font-medium ${close.differenceCents !== 0 ? "text-red-600" : ""}`}
                      >
                        {formatMoney(close.differenceCents, register.currency)}
                      </td>
                    </tr>
                  ))}
                  {closes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {t("cash.detail.noDailyCloses")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry Dialog */}
      <Dialog open={!!entryType} onOpenChange={(open) => !open && setEntryType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entryType === "IN" ? t("cash.detail.addCashIn") : t("cash.detail.addCashOut")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>
                {t("common.amount")} ({register.currency})
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={paramAmount}
                onChange={(e) => setParamAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>{t("common.description")}</Label>
              <Textarea
                placeholder={t("cash.detail.reasonPlaceholder")}
                value={paramDesc}
                onChange={(e) => setParamDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryType(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateEntry}
              className={
                entryType === "IN"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              disabled={createEntryMutation.isPending}
            >
              {entryType === "IN" ? t("cash.detail.confirmIn") : t("cash.detail.confirmOut")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
