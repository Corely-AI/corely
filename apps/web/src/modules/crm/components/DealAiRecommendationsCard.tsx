import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Skeleton } from "@/shared/components/Skeleton";
import type { DealAiRecommendation } from "@corely/contracts";

interface DealAiRecommendationsCardProps {
  enabled: boolean;
  offline: boolean;
  loading: boolean;
  error: string | null;
  recommendations: DealAiRecommendation[];
  onRefresh: () => void;
  onApply: (recommendation: DealAiRecommendation) => void;
}

export const DealAiRecommendationsCard: React.FC<DealAiRecommendationsCardProps> = ({
  enabled,
  offline,
  loading,
  error,
  recommendations,
  onRefresh,
  onApply,
}) => {
  if (!enabled) {
    return null;
  }

  return (
    <Card data-testid="crm-deal-ai-recommendations">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Next Best Actions</CardTitle>
          <Button size="sm" variant="outline" onClick={onRefresh} disabled={offline || loading}>
            Refresh
          </Button>
        </div>
        {offline ? <p className="text-xs text-muted-foreground">AI requires connection.</p> : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : null}

        {!loading && error ? <p className="text-destructive text-xs">{error}</p> : null}

        {!loading &&
          !error &&
          recommendations.map((recommendation) => (
            <div
              key={recommendation.id}
              className="rounded-md border p-3 flex items-start justify-between gap-2"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{recommendation.title}</p>
                  <Badge variant="secondary">{recommendation.type}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{recommendation.reason}</p>
                <p className="text-[11px] text-muted-foreground">
                  Confidence: {Math.round(recommendation.confidence * 100)}%
                </p>
              </div>
              <Button size="sm" onClick={() => onApply(recommendation)} disabled={offline}>
                Apply
              </Button>
            </div>
          ))}

        {!loading && !error && recommendations.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recommendations right now.</p>
        ) : null}
      </CardContent>
    </Card>
  );
};
