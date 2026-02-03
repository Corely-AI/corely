import React from "react";
import { type TaxSnapshot } from "@corely/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Skeleton } from "@/shared/components/Skeleton";

interface SnapshotKPIsProps {
  snapshot: TaxSnapshot | undefined;
  isLoading: boolean;
  year: number;
}

export const SnapshotKPIs = ({ snapshot, isLoading, year }: SnapshotKPIsProps) => {
  if (isLoading || !snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>YTD Snapshot ({year})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>YTD Snapshot ({year})</CardTitle>
          <span className="text-xs text-muted-foreground">
            Updated {new Date(snapshot.updatedAt).toLocaleDateString()}
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
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: kpi.currency ?? "EUR",
              }).format(kpi.value / 100)}
            </span>
          </div>
        ))}
        {snapshot.kpis.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No data available yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
