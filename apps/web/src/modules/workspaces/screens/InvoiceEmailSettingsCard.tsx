import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  LoadingSkeleton,
  Switch,
  useToast,
} from "@corely/ui";
import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { purchasingApi } from "@/lib/purchasing-api";

export function InvoiceEmailSettingsCard({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const queryKey = ["invoice-email-settings", workspaceId];
  const settings = useQuery({
    queryKey,
    queryFn: () => purchasingApi.getInvoiceEmailSettings(),
    retry: false,
  });
  const update = useMutation({
    mutationFn: (enabled: boolean) => purchasingApi.setInvoiceEmailEnabled(enabled),
    onSuccess: (result) => queryClient.setQueryData(queryKey, result),
  });
  const data = settings.data;
  if (settings.error && [401, 403, 404].includes(normalizeError(settings.error).status)) {
    return null;
  }

  const copyAddress = async () => {
    if (!data?.address) {
      return;
    }
    try {
      await navigator.clipboard.writeText(data.address);
      toast({ title: t("purchasing.invoiceEmail.copied") });
    } catch {
      toast({ title: t("purchasing.invoiceEmail.copyFailed"), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("purchasing.invoiceEmail.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.isLoading && (
          <LoadingSkeleton label={t("purchasing.invoiceEmail.loading")} variant="form" />
        )}
        {settings.isError && (
          <div className="space-y-2">
            <p role="alert">{t("purchasing.invoiceEmail.loadFailed")}</p>
            <Button variant="outline" onClick={() => void settings.refetch()}>
              {t("purchasing.invoiceEmail.retry")}
            </Button>
          </div>
        )}
        {data && (
          <>
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="invoice-email-enabled">{t("purchasing.invoiceEmail.enable")}</Label>
                <p className="text-sm text-muted-foreground">
                  {t(
                    data.available
                      ? "purchasing.invoiceEmail.description"
                      : "purchasing.invoiceEmail.unavailable"
                  )}
                </p>
              </div>
              <Switch
                id="invoice-email-enabled"
                checked={data.enabled}
                disabled={update.isPending || (!data.available && !data.enabled)}
                onCheckedChange={(enabled) => update.mutate(enabled)}
              />
            </div>
            {update.isError && (
              <p role="alert" className="text-sm text-destructive">
                {t("purchasing.invoiceEmail.updateFailed")}
              </p>
            )}
            {data.enabled && data.address && (
              <div className="space-y-2">
                <Label htmlFor="invoice-email-address">
                  {t("purchasing.invoiceEmail.address")}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="invoice-email-address"
                    className="min-w-0"
                    readOnly
                    value={data.address}
                  />
                  <Button type="button" variant="outline" onClick={() => void copyAddress()}>
                    <Copy className="h-4 w-4" />
                    {t("purchasing.invoiceEmail.copy")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
