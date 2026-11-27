import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Switch } from "@corely/ui";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { expenseReceiptEmailApi } from "@corely/web-shared/lib/expense-receipt-email-api";

export function ExpenseReceiptEmailSettingsCard({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const key = ["expense-receipt-email-settings", workspaceId];
  const settings = useQuery({
    queryKey: key,
    queryFn: expenseReceiptEmailApi.settings,
    retry: false,
  });
  const update = useMutation({
    mutationFn: expenseReceiptEmailApi.enable,
    onSuccess: (data) => queryClient.setQueryData(key, data),
  });
  const personal = useMutation({
    mutationFn: expenseReceiptEmailApi.makePersonal,
    onSuccess: (data) => queryClient.setQueryData(key, data),
  });

  const data = settings.data;
  if (settings.error && [401, 403, 404].includes(normalizeError(settings.error).status)) {
    return null;
  }
  if (data && !data.canManage && !data.enabled) {
    return null;
  }
  const copy = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success(t("expenses.receiptEmail.copied"));
    } catch {
      toast.error(t("expenses.receiptEmail.copyFailed"));
    }
  };
  const addressField = (id: string, title: string, value: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{title}</Label>
      <div className="flex gap-2">
        <Input id={id} value={value} readOnly className="min-w-0" />
        <Button variant="outline" type="button" onClick={() => void copy(value)}>
          <Copy className="h-4 w-4" /> {t("expenses.receiptEmail.copy")}
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("expenses.receiptEmail.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.isPending && <p role="status">{t("expenses.receiptEmail.loading")}</p>}
        {settings.isError && <p role="alert">{t("expenses.receiptEmail.loadFailed")}</p>}
        {data?.canManage && (
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label htmlFor="expense-receipt-toggle">{t("expenses.receiptEmail.enable")}</Label>
              <p className="text-sm text-muted-foreground">
                {t(
                  data.available
                    ? "expenses.receiptEmail.description"
                    : "expenses.receiptEmail.unavailable"
                )}
              </p>
            </div>
            <Switch
              id="expense-receipt-toggle"
              checked={data.enabled}
              disabled={update.isPending || (!data.available && !data.enabled)}
              onCheckedChange={(enabled) => update.mutate(enabled)}
            />
          </div>
        )}
        {data?.enabled &&
          data.address &&
          addressField("expense-shared-address", t("expenses.receiptEmail.shared"), data.address)}
        {data?.enabled && data.available && data.canForward && (
          <div className="space-y-2">
            {data.personalAddress ? (
              addressField(
                "expense-personal-address",
                t("expenses.receiptEmail.personal"),
                data.personalAddress
              )
            ) : (
              <Button
                variant="outline"
                disabled={personal.isPending}
                onClick={() => personal.mutate()}
              >
                {t("expenses.receiptEmail.makePersonal")}
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              {t("expenses.receiptEmail.personalHint")}
            </p>
          </div>
        )}
        {(update.error || personal.error) && (
          <p role="alert" className="text-sm text-destructive">
            {t("expenses.receiptEmail.saveFailed")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
