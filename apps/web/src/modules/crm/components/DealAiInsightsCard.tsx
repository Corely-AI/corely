import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Skeleton } from "@/shared/components/Skeleton";
import type { DealAiInsights } from "@corely/contracts";

interface DealAiInsightsCardProps {
  enabled: boolean;
  offline: boolean;
  loading: boolean;
  error: string | null;
  insights: DealAiInsights | null;
  onGenerate: () => void;
}

export const DealAiInsightsCard: React.FC<DealAiInsightsCardProps> = ({
  enabled,
  offline,
  loading,
  error,
  insights,
  onGenerate,
}) => {
  if (!enabled) {
    return null;
  }

  return (
    <Card data-testid="crm-deal-ai-insights">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>AI Insights</CardTitle>
          <Button size="sm" variant="outline" onClick={onGenerate} disabled={offline || loading}>
            {loading ? "Generating..." : "Generate insights"}
          </Button>
        </div>
        {offline ? <p className="text-xs text-muted-foreground">AI requires connection.</p> : null}
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : null}

        {!loading && error ? <p className="text-destructive text-xs">{error}</p> : null}

        {!loading && !error && insights ? (
          <>
            <div className="space-y-1">
              <p>Situation: {insights.summary.situation}</p>
              <p>Last interaction: {insights.summary.lastInteraction}</p>
              <p>Stakeholders: {insights.summary.keyStakeholders}</p>
              <p>Needs: {insights.summary.needs}</p>
              <p>Objections: {insights.summary.objections}</p>
              <p>Next step: {insights.summary.nextStep}</p>
            </div>

            <div>
              <p className="text-xs font-medium mb-1">What&apos;s missing</p>
              {insights.whatMissing.length ? (
                <div className="flex flex-wrap gap-2">
                  {insights.whatMissing.map((item) => (
                    <Badge key={item.code} variant="secondary">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No critical gaps detected.</p>
              )}
            </div>

            <div>
              <p className="text-xs font-medium mb-1">Entities</p>
              {insights.keyEntities.length ? (
                <div className="flex flex-wrap gap-2">
                  {insights.keyEntities.map((entity, index) => (
                    <Badge key={`${entity.kind}-${entity.value}-${index}`} variant="outline">
                      {entity.kind}: {entity.value}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No extracted entities.</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Confidence: {Math.round(insights.confidence * 100)}% • Freshness:{" "}
              {new Date(insights.freshnessTimestamp).toLocaleString()}
            </p>
          </>
        ) : null}

        {!loading && !error && !insights ? (
          <p className="text-xs text-muted-foreground">Generate insights to view deal context.</p>
        ) : null}
      </CardContent>
    </Card>
  );
};
