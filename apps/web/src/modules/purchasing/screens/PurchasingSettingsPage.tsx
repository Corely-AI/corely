import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { purchasingApi } from "@/lib/purchasing-api";

export default function PurchasingSettingsPage() {
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
        <h1 className="text-h1 text-foreground">Purchasing Settings</h1>
        <Button variant="accent" onClick={() => saveSettings.mutate()}>
          Save Settings
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Input
                value={defaultCurrency}
                onChange={(event) => setDefaultCurrency(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Payment Terms</Label>
              <Input
                value={defaultPaymentTerms}
                onChange={(event) => setDefaultPaymentTerms(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>PO Numbering Prefix</Label>
              <Input
                value={poNumberingPrefix}
                onChange={(event) => setPoNumberingPrefix(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default AP Account</Label>
              <Input
                value={defaultAccountsPayableAccountId}
                onChange={(event) => setDefaultAccountsPayableAccountId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Expense Account</Label>
              <Input
                value={defaultExpenseAccountId}
                onChange={(event) => setDefaultExpenseAccountId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Bank Account</Label>
              <Input
                value={defaultBankAccountId}
                onChange={(event) => setDefaultBankAccountId(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-post when bill is posted</Label>
                <p className="text-sm text-muted-foreground">
                  Creates and posts journal entries on bill posting.
                </p>
              </div>
              <Switch checked={autoPostOnBillPost} onCheckedChange={setAutoPostOnBillPost} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-post when payment is recorded</Label>
                <p className="text-sm text-muted-foreground">
                  Creates AP/Bank journal entries for payments.
                </p>
              </div>
              <Switch
                checked={autoPostOnPaymentRecord}
                onCheckedChange={setAutoPostOnPaymentRecord}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Duplicate detection</Label>
                <p className="text-sm text-muted-foreground">Warn when bills look duplicated.</p>
              </div>
              <Switch
                checked={billDuplicateDetectionEnabled}
                onCheckedChange={setBillDuplicateDetectionEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Approval required for bills</Label>
                <p className="text-sm text-muted-foreground">Require approval before posting.</p>
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
