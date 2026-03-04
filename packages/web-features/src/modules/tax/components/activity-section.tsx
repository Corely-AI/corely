import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { formatDateTime } from "@corely/web-shared/shared/lib/formatters";
import { useTaxFilingActivityQuery } from "../hooks/useTaxFilingActivityQuery";

type ActivitySectionProps = {
  filingId: string;
};

const LABELS: Record<string, string> = {
  created: "Filing created",
  recalculated: "Recalculated",
  submitted: "Submitted",
  paid: "Marked paid",
  attachmentAdded: "Attachment added",
  issuesDetected: "Issues detected",
  issuesResolved: "Issues resolved",
  deleted: "Deleted",
};

export function ActivitySection({ filingId }: ActivitySectionProps) {
  const { data, isLoading, isError } = useTaxFilingActivityQuery(filingId);
  const events = data?.events ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? <p className="text-sm text-muted-foreground">Loading activity...</p> : null}
        {isError ? <p className="text-sm text-destructive">Failed to load activity.</p> : null}
        {events.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : null}
        {events.map((event) => (
          <div key={event.id} className="rounded-md border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium">{LABELS[event.type] ?? event.type}</span>
              <span className="text-muted-foreground">
                {formatDateTime(event.timestamp, "en-US")}
              </span>
            </div>
            {event.actor?.name || event.actor?.email || event.actor?.id ? (
              <p className="mt-1 text-xs text-muted-foreground">
                By {event.actor?.name ?? event.actor?.email ?? event.actor?.id}
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
