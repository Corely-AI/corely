import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Switch } from "@corely/ui";
import { purchasingApi } from "@/lib/purchasing-api";

export default function PurchasingSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["purchasingSettings"],
    queryFn: () => purchasingApi.getSettings(),
  });

  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState("");
  const [poNumberingPrefix, setPoNumberingPrefix] = useState("PO-");
  const [defaultAccountsPayableAccountId, setDefaultAccountsPayableAccountId] = useState("");
  const [defaultExpenseAccountId, setDefaultExpenseAccountId] = useState("");
  const [defaultBankAccountId, setDefaultBankAccountId] = useState("");
  const [autoPostOnBillPost, setAutoPostOnBillPost] = useState(true);
  const [autoPostOnPaymentRecord, setAutoPostOnPaymentRecord] = useState(true);
  const [billDuplicateDetectionEnabled, setBillDuplicateDetectionEnabled] = useState(true);
  const [approvalRequiredForBills, setApprovalRequiredForBills] = useState(false);

  useEffect(() => {
    if (data) {
      setDefaultCurrency(data.defaultCurrency);
      setDefaultPaymentTerms(data.defaultPaymentTerms || "");
      setPoNumberingPrefix(data.poNumberingPrefix);
      setDefaultAccountsPayableAccountId(data.defaultAccountsPayableAccountId || "");
      setDefaultExpenseAccountId(data.defaultExpenseAccountId || "");
      setDefaultBankAccountId(data.defaultBankAccountId || "");
      setAutoPostOnBillPost(data.autoPostOnBillPost);
      setAutoPostOnPaymentRecord(data.autoPostOnPaymentRecord);
      setBillDuplicateDetectionEnabled(data.billDuplicateDetectionEnabled);
      setApprovalRequiredForBills(data.approvalRequiredForBills);
    }
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: () =>
      purchasingApi.updateSettings({
        defaultCurrency,
        defaultPaymentTerms: defaultPaymentTerms || null,
        poNumberingPrefix,
        defaultAccountsPayableAccountId: defaultAccountsPayableAccountId || null,
        defaultExpenseAccountId: defaultExpenseAccountId || null,
        defaultBankAccountId: defaultBankAccountId || null,
        autoPostOnBillPost,
        autoPostOnPaymentRecord,
        billDuplicateDetectionEnabled,
        approvalRequiredForBills,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchasingSettings"] }),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("purchasing.settings.title")}</h1>
        <Button variant="accent" onClick={() => saveSettings.mutate()}>
          {t("purchasing.settings.save")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("purchasing.settings.defaultCurrency")}</Label>
              <Input
                value={defaultCurrency}
                onChange={(event) => setDefaultCurrency(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchasing.settings.defaultPaymentTerms")}</Label>
              <Input
                value={defaultPaymentTerms}
                onChange={(event) => setDefaultPaymentTerms(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchasing.settings.poNumberPrefix")}</Label>
              <Input
                value={poNumberingPrefix}
                onChange={(event) => setPoNumberingPrefix(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchasing.settings.defaultApAccount")}</Label>
              <Input
                value={defaultAccountsPayableAccountId}
                onChange={(event) => setDefaultAccountsPayableAccountId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchasing.settings.defaultExpenseAccount")}</Label>
              <Input
                value={defaultExpenseAccountId}
                onChange={(event) => setDefaultExpenseAccountId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("purchasing.settings.defaultBankAccount")}</Label>
              <Input
                value={defaultBankAccountId}
                onChange={(event) => setDefaultBankAccountId(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("purchasing.settings.autoPostBill")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("purchasing.settings.autoPostBillHelp")}
                </p>
              </div>
              <Switch checked={autoPostOnBillPost} onCheckedChange={setAutoPostOnBillPost} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("purchasing.settings.autoPostPayment")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("purchasing.settings.autoPostPaymentHelp")}
                </p>
              </div>
              <Switch
                checked={autoPostOnPaymentRecord}
                onCheckedChange={setAutoPostOnPaymentRecord}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("purchasing.settings.duplicateDetection")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("purchasing.settings.duplicateDetectionHelp")}
                </p>
              </div>
              <Switch
                checked={billDuplicateDetectionEnabled}
                onCheckedChange={setBillDuplicateDetectionEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("purchasing.settings.approvalRequired")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("purchasing.settings.approvalRequiredHelp")}
                </p>
              </div>
              <Switch
                checked={approvalRequiredForBills}
                onCheckedChange={setApprovalRequiredForBills}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
