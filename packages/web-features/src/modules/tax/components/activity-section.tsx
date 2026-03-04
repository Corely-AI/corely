import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { formatDateTime } from "@corely/web-shared/shared/lib/formatters";
import { useTaxFilingActivityQuery } from "../hooks/useTaxFilingActivityQuery";

type ActivitySectionProps = {
  filingId: string;
};

import { useTranslation } from "react-i18next";

export function ActivitySection({ filingId }: ActivitySectionProps) {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError } = useTaxFilingActivityQuery(filingId);
  const events = data?.events ?? [];

  const locale = t("common.locale", { defaultValue: i18n.language === "de" ? "de-DE" : "en-US" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tax.activity.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("tax.activity.loading")}</p>
        ) : null}
        {isError ? <p className="text-sm text-destructive">{t("tax.activity.error")}</p> : null}
        {events.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">{t("tax.activity.noActivity")}</p>
        ) : null}
        {events.map((event) => (
          <div key={event.id} className="rounded-md border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">
                {t(`tax.activity.types.${event.type}`, { defaultValue: event.type })}
              </span>
              <span className="text-muted-foreground">
                {formatDateTime(event.timestamp, locale)}
              </span>
            </div>
            {event.actor?.name || event.actor?.email || event.actor?.id ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("tax.activity.by", {
                  name: event.actor?.name ?? event.actor?.email ?? event.actor?.id,
                })}
              </p>
            ) : null}
            {event.notes ? (
              <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>
            ) : null}
            {event.payload ? (
              <p className="mt-1 text-xs text-muted-foreground">{JSON.stringify(event.payload)}</p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
