import React from "react";
import { type TaxSnapshot } from "@corely/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Skeleton } from "@corely/web-shared/shared/components/Skeleton";
import { useTranslation } from "react-i18next";

interface SnapshotKPIsProps {
  snapshot: TaxSnapshot | undefined;
  isLoading: boolean;
  year: number;
}

export const SnapshotKPIs = ({ snapshot, isLoading, year }: SnapshotKPIsProps) => {
  const { t, i18n } = useTranslation();
  if (isLoading || !snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("tax.center.snapshot.title", { year })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  const locale = t("common.locale", { defaultValue: i18n.language === "de" ? "de-DE" : "en-US" });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("tax.center.snapshot.title", { year })}</CardTitle>
          <span className="text-xs text-muted-foreground">
            {t("tax.center.snapshot.updated", {
              date: new Date(snapshot.updatedAt).toLocaleDateString(locale),
            })}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="flex items-center justify-between py-1 border-b last:border-0 border-border/50"
          >
            <span className="text-sm text-muted-foreground">{kpi.label}</span>
            <span className="font-medium font-mono">
              {new Intl.NumberFormat(locale, {
                style: "currency",
                currency: kpi.currency ?? "EUR",
              }).format(kpi.value / 100)}
            </span>
          </div>
        ))}
        {snapshot.kpis.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            {t("tax.center.snapshot.noData")}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
