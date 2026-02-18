import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Skeleton } from "@/shared/components/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@corely/ui";
import { Switch } from "@corely/ui";
import type {
  ChannelDefinition,
  CommunicationAiSummarizeOutput,
  CreateActivityToolCard,
  DealAiHealth,
  DealAiInsights,
  DealAiRecommendation,
  DealDto,
  TimelineItem,
} from "@corely/contracts";
import { DealAiHealthBadge } from "./DealAiHealthBadge";
import { DealAiInsightsCard } from "./DealAiInsightsCard";
import { DealAiRecommendationsCard } from "./DealAiRecommendationsCard";
import { DealDetailsCard } from "./DealDetailsCard";
import { DealHeader } from "./DealHeader";
import { DealMetaSidebar } from "./DealMetaSidebar";
import { DealQuickActions } from "./DealQuickActions";
import { ActivityComposer } from "./ActivityComposer";
import { TimelineView } from "./TimelineView";

interface DealDetailMainContentProps {
  deal: DealDto;
  stages: { id: string; name: string; isClosed?: boolean }[];
  isOpen: boolean;
  detailsEditing: boolean;
  onDetailsEditingChange: (open: boolean) => void;
  onUpdateDetails: (patch: {
    notes?: string;
    probability?: number;
    expectedCloseDate?: string;
  }) => void;
  updateDealPending: boolean;
  health: DealAiHealth | null;
  onEditHeader: () => void;
  onChangeStage: (stageId: string) => void;
  onMarkWon: () => void;
  onMarkLost: () => void;
  onDelete: () => void;
  timelineFilter: string;
  onTimelineFilterChange: (value: string) => void;
  channels: ChannelDefinition[];
  channelsLoading: boolean;
  timelineChannels: string[];
  onToggleTimelineChannel: (channelKey: string) => void;
  timelineLoading: boolean;
  timelineItems: TimelineItem[];
  aiEnabled: boolean;
  offline: boolean;
  insightsLoading: boolean;
  insightsError: string | null;
  insights: DealAiInsights | null;
  onGenerateInsights: () => void;
  recommendationsLoading: boolean;
  recommendationsError: string | null;
  recommendations: DealAiRecommendation[];
  onRefreshRecommendations: () => void;
  onApplyRecommendation: (recommendation: DealAiRecommendation) => void;
  intentSentimentEnabled: boolean;
  onToggleIntentSentiment: (enabled: boolean) => void;
  updateAiSettingsPending: boolean;
  summarizePending: boolean;
  summaryError: string | null;
  summaryResult: CommunicationAiSummarizeOutput | null;
  onSelectFollowUpToolCard: (toolCard: CreateActivityToolCard) => void;
  onQuickNote: (subject: string, body?: string) => void;
  quickActionsDisabled: boolean;
  onSelectChannel: (channel: ChannelDefinition) => void;
  contactContext: Record<string, string | undefined>;
}

export const DealDetailMainContent: React.FC<DealDetailMainContentProps> = ({
  deal,
  stages,
  isOpen,
  detailsEditing,
  onDetailsEditingChange,
  onUpdateDetails,
  updateDealPending,
  health,
  onEditHeader,
  onChangeStage,
  onMarkWon,
  onMarkLost,
  onDelete,
  timelineFilter,
  onTimelineFilterChange,
  channels,
  channelsLoading,
  timelineChannels,
  onToggleTimelineChannel,
  timelineLoading,
  timelineItems,
  aiEnabled,
  offline,
  insightsLoading,
  insightsError,
  insights,
  onGenerateInsights,
  recommendationsLoading,
  recommendationsError,
  recommendations,
  onRefreshRecommendations,
  onApplyRecommendation,
  intentSentimentEnabled,
  onToggleIntentSentiment,
  updateAiSettingsPending,
  summarizePending,
  summaryError,
  summaryResult,
  onSelectFollowUpToolCard,
  onQuickNote,
  quickActionsDisabled,
  onSelectChannel,
  contactContext,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <DealHeader
        deal={deal}
        stages={stages}
        healthBadge={<DealAiHealthBadge visible={aiEnabled} health={health} />}
        onEdit={onEditHeader}
        onChangeStage={onChangeStage}
        onMarkWon={onMarkWon}
        onMarkLost={onMarkLost}
        onDelete={onDelete}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DealDetailsCard
            deal={deal}
            onSave={onUpdateDetails}
            isSaving={updateDealPending}
            editing={detailsEditing}
            onEditingChange={onDetailsEditingChange}
          />

          <Card>
            <CardContent className="p-0">
              <Tabs value={timelineFilter} onValueChange={onTimelineFilterChange}>
                <div className="flex items-center justify-between px-6 pt-6">
                  <div>
                    <p className="text-lg font-semibold">{t("crm.timeline.title")}</p>
                    <p className="text-sm text-muted-foreground">{t("crm.timeline.subtitle")}</p>
                  </div>
                  <TabsList>
                    <TabsTrigger value="ALL">{t("crm.timeline.filters.all")}</TabsTrigger>
                    <TabsTrigger value="NOTE">{t("crm.timeline.filters.notes")}</TabsTrigger>
                    <TabsTrigger value="CALL">{t("crm.timeline.filters.calls")}</TabsTrigger>
                    <TabsTrigger value="MEETING">{t("crm.timeline.filters.meetings")}</TabsTrigger>
                    <TabsTrigger value="TASK">{t("crm.timeline.filters.tasks")}</TabsTrigger>
                    <TabsTrigger value="COMMUNICATION">
                      {t("crm.timeline.filters.communications")}
                    </TabsTrigger>
                    <TabsTrigger value="STAGE">{t("crm.timeline.filters.stage")}</TabsTrigger>
                  </TabsList>
                </div>
                {channels.length ? (
                  <div className="px-6 pt-3 flex flex-wrap items-center gap-2">
                    {channels.map((channel) => {
                      const active = timelineChannels.includes(channel.key);
                      return (
                        <Button
                          key={channel.key}
                          type="button"
                          variant={active ? "secondary" : "outline"}
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => onToggleTimelineChannel(channel.key)}
                        >
                          {channel.label}
                        </Button>
                      );
                    })}
                  </div>
                ) : null}
                <TabsContent value={timelineFilter}>
                  <div className="p-6">
                    {timelineLoading ? (
                      <Skeleton className="h-24" />
                    ) : (
                      <TimelineView items={timelineItems} />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <ActivityComposer dealId={deal.id} partyId={deal.partyId} />
        </div>

        <div className="space-y-6">
          <DealAiInsightsCard
            enabled={aiEnabled}
            offline={offline}
            loading={insightsLoading}
            error={insightsError}
            insights={insights}
            onGenerate={onGenerateInsights}
          />

          <DealAiRecommendationsCard
            enabled={aiEnabled}
            offline={offline}
            loading={recommendationsLoading}
            error={recommendationsError}
            recommendations={recommendations}
            onRefresh={onRefreshRecommendations}
            onApply={onApplyRecommendation}
          />

          {aiEnabled ? (
            <Card data-testid="crm-deal-ai-summary-card">
              <CardHeader className="pb-3">
                <CardTitle>Communication AI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="font-medium">Inbound intent/sentiment</p>
                    <p className="text-xs text-muted-foreground">
                      Classify inbound communication intent and sentiment.
                    </p>
                  </div>
                  <Switch
                    checked={intentSentimentEnabled}
                    onCheckedChange={onToggleIntentSentiment}
                    disabled={updateAiSettingsPending}
                  />
                </div>

                {offline ? (
                  <p className="text-xs text-muted-foreground">AI requires connection.</p>
                ) : null}

                {summarizePending ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                ) : null}

                {!summarizePending && summaryError ? (
                  <p className="text-xs text-destructive">{summaryError}</p>
                ) : null}

                {!summarizePending && !summaryError && summaryResult ? (
                  <div className="space-y-3">
                    <p>{summaryResult.result.summary}</p>
                    {summaryResult.intentSentiment ? (
                      <p className="text-xs text-muted-foreground">
                        Intent: {summaryResult.intentSentiment.intentLabels.join(", ")} • Sentiment:{" "}
                        {summaryResult.intentSentiment.sentiment} • Confidence:{" "}
                        {Math.round(summaryResult.intentSentiment.confidence * 100)}%
                      </p>
                    ) : null}
                    {summaryResult.followUpToolCards.length ? (
                      <div className="space-y-2">
                        {summaryResult.followUpToolCards.map((toolCard) => (
                          <div
                            key={toolCard.idempotencyKey ?? toolCard.title}
                            className="border rounded-md p-2 flex items-center justify-between gap-2"
                          >
                            <div>
                              <p className="font-medium text-xs">{toolCard.payload.subject}</p>
                              <p className="text-[11px] text-muted-foreground">{toolCard.title}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => onSelectFollowUpToolCard(toolCard)}
                            >
                              Create follow-up
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!summarizePending && !summaryError && !summaryResult ? (
                  <p className="text-xs text-muted-foreground">
                    Add a note or communication to generate summary and follow-up tasks.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <DealQuickActions
            deal={deal}
            stages={stages}
            onChangeStage={onChangeStage}
            onMarkWon={onMarkWon}
            onMarkLost={onMarkLost}
            onQuickNote={onQuickNote}
            onDelete={onDelete}
            disabled={quickActionsDisabled || !isOpen}
            channels={channels}
            channelsLoading={channelsLoading}
            onSelectChannel={onSelectChannel}
            contactContext={contactContext}
          />

          <DealMetaSidebar deal={deal} />
        </div>
      </div>
    </>
  );
};
