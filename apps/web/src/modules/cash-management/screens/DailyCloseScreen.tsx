import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { formatMoney } from "@/shared/lib/formatters";
import { cashManagementApi } from "@/lib/cash-management-api";
import { cashKeys } from "../queries";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export function DailyCloseScreen() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>(); // registerId
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [businessDate, setBusinessDate] = useState(new Date().toISOString().split("T")[0]);
  const [countedStr, setCountedStr] = useState("");
  const [notes, setNotes] = useState("");

  const { data: regData, isLoading: regLoading } = useQuery({
    queryKey: id ? cashKeys.registers.detail(id) : ["cash", "registers", "none"],
    queryFn: () => (id ? cashManagementApi.getRegister(id) : Promise.reject("No ID")),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: (data: { counted: number; notes: string; date: string }) => {
      if (!id) {
        throw new Error("No register ID");
      }
      return cashManagementApi.submitDailyClose(id, {
        registerId: id,
        countedBalanceCents: data.counted,
        notes: data.notes,
        businessDate: data.date,
      });
    },
    onSuccess: async () => {
      if (!id) {
        return;
      }
      await queryClient.invalidateQueries({ queryKey: cashKeys.registers.detail(id) });
      await queryClient.invalidateQueries({ queryKey: cashKeys.dailyCloses.list(id, {}) });
      toast.success(t("cash.dailyClose.submitted"));
      navigate(`/cash-registers/${id}`);
    },
    onError: (err: any) => {
      toast.error(
        `${t("cash.dailyClose.submitFailed")}: ${err.response?.data?.message || err.message}`
      );
    },
  });

  if (!id) {
    return null;
  }

  const register = regData?.register;

  if (regLoading) {
    return <div className="p-6">{t("common.loading")}</div>;
  }
  if (!register) {
    return <div className="p-6">{t("errors.pageNotFound")}</div>;
  }

  const expectedCents = register.currentBalanceCents;
  const countedCents = countedStr ? Math.round(parseFloat(countedStr) * 100) : 0;
  const difference = countedCents - expectedCents;

  const handleSubmit = () => {
    if (!countedStr) {
      toast.error(t("cash.dailyClose.enterCountedAmount"));
      return;
    }
    submitMutation.mutate({ counted: countedCents, notes, date: businessDate });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back")}
        </Button>
        <h1 className="text-2xl font-bold">{t("cash.dailyClose.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("cash.dailyClose.reconcile", { register: register.name })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">{t("cash.dailyClose.businessDate")}</Label>
              <Input
                type="date"
                value={businessDate}
                onChange={(e) => setBusinessDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-muted-foreground">
                {t("cash.dailyClose.expectedBalance")}
              </Label>
              <div className="text-2xl font-bold py-1">
                {formatMoney(expectedCents, register.currency)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("cash.dailyClose.countedCash", { currency: register.currency })}</Label>
            <Input
              type="number"
              step="0.01"
              className="text-lg"
              placeholder="0.00"
              value={countedStr}
              onChange={(e) => setCountedStr(e.target.value)}
              autoFocus
            />
          </div>

          {countedStr && (
            <div
              className={`p-4 rounded-md flex items-center gap-3 ${difference === 0 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}
            >
              {difference === 0 ? (
                <Check className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <div className="flex-1">
                <div className="font-medium">
                  {difference === 0
                    ? t("cash.dailyClose.perfectMatch")
                    : t("cash.dailyClose.discrepancyDetected")}
                </div>
                <div className="text-sm">
                  {t("cash.dailyClose.difference")}: {difference > 0 ? "+" : ""}
                  {formatMoney(difference, register.currency)}
                  {difference !== 0 && ` (${t("cash.dailyClose.differenceEntryNote")})`}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("common.notes")}</Label>
            <Textarea
              placeholder={t("cash.dailyClose.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!countedStr || submitMutation.isPending}>
            {submitMutation.isPending
              ? t("cash.dailyClose.submitting")
              : t("cash.dailyClose.submitClose")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
