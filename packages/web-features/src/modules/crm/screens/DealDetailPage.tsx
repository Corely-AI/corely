import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Skeleton } from "@corely/web-shared/shared/components/Skeleton";
import { DealDetailMainContent } from "../components/DealDetailMainContent";
import { DealDetailOverlays } from "../components/DealDetailOverlays";
import {
  dealQueryKeys,
  type TimelineFilter,
  useAddDealActivity,
  useChangeDealStage,
  useCrmAiSettings,
  useDeal,
  useDealAiInsights,
  useDealAiRecommendations,
  useDealTimeline,
  useMarkDealLost,
  useMarkDealWon,
  usePipelineStages,
  useUpdateCrmAiSettings,
  useUpdateDeal,
} from "../hooks/useDeal";
import { useCrmChannels } from "../hooks/useChannels";
import { customersApi } from "@corely/web-shared/lib/customers-api";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import type {
  ChannelDefinition,
  CommunicationAiSummarizeOutput,
  CreateActivityToolCard,
  CrmMessageDraft,
  DealAiRecommendation,
} from "@corely/contracts";
import { toast } from "sonner";

const DealSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-8 w-24" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Skeleton className="h-64 lg:col-span-2" />
      <Skeleton className="h-64" />
    </div>
  </div>
);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function DealDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detailsEditing, setDetailsEditing] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("ALL");
  const [timelineChannels, setTimelineChannels] = useState<string[]>([]);
  const [lostReason, setLostReason] = useState("");
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelDefinition | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [aiDraftOpen, setAiDraftOpen] = useState(false);
  const [aiDraftChannelKey, setAiDraftChannelKey] = useState("email");
  const [aiDraft, setAiDraft] = useState<CrmMessageDraft | null>(null);
  const [summaryResult, setSummaryResult] = useState<CommunicationAiSummarizeOutput | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [pendingRecommendation, setPendingRecommendation] = useState<DealAiRecommendation | null>(
    null
  );
  const [pendingFollowUpToolCard, setPendingFollowUpToolCard] =
    useState<CreateActivityToolCard | null>(null);
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();

  useEffect(() => {
    const markOnline = () => setIsOnline(true);
    const markOffline = () => setIsOnline(false);
    window.addEventListener("online", markOnline);
    window.addEventListener("offline", markOffline);
    return () => {
      window.removeEventListener("online", markOnline);
      window.removeEventListener("offline", markOffline);
    };
  }, []);

  const stages = usePipelineStages();
  const { data: deal, isLoading, isError, refetch } = useDeal(id);
  const { data: timelineData, isLoading: timelineLoading } = useDealTimeline(id, timelineFilter);
  const { data: channels, isLoading: channelsLoading } = useCrmChannels();
  const { data: aiSettings } = useCrmAiSettings();
  const updateAiSettings = useUpdateCrmAiSettings();
  const aiEnabled = Boolean(aiSettings?.settings.aiEnabled);
  const offline = !isOnline;

  const insightsQuery = useDealAiInsights(deal?.id, Boolean(deal?.id && aiEnabled));
  const recommendationsQuery = useDealAiRecommendations(deal?.id, Boolean(deal?.id && aiEnabled));

  const { data: party } = useQuery({
    queryKey: ["deal-party", deal?.partyId],
    queryFn: () => customersApi.getCustomer(deal?.partyId as string),
    enabled: Boolean(deal?.partyId),
  });

  const refreshInsights = useMutation({
    mutationFn: async () => {
      if (!deal?.id) {
        throw new Error("Deal id is required");
      }
      return crmApi.getDealAiInsights(deal.id, { refresh: true });
    },
    onSuccess: (data) => {
      if (!deal?.id) {
        return;
      }
      queryClient.setQueryData(dealQueryKeys.aiInsights(deal.id), data);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to refresh AI insights"));
    },
  });

  const refreshRecommendations = useMutation({
    mutationFn: async () => {
      if (!deal?.id) {
        throw new Error("Deal id is required");
      }
      return crmApi.getDealAiRecommendations(deal.id, { refresh: true });
    },
    onSuccess: (data) => {
      if (!deal?.id) {
        return;
      }
      queryClient.setQueryData(dealQueryKeys.aiRecommendations(deal.id), data);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to refresh AI recommendations"));
    },
  });

  const draftMessageMutation = useMutation({
    mutationFn: async (params: {
      channel: string;
      personalizeWithTimeline: boolean;
      translateToWorkspaceLanguage: boolean;
    }) => {
      if (!deal?.id) {
        throw new Error("Deal id is required");
      }
      return crmApi.draftDealAiMessage(deal.id, {
        channel: params.channel,
        personalizeWithTimeline: params.personalizeWithTimeline,
        translateToWorkspaceLanguage: params.translateToWorkspaceLanguage,
        workspaceLanguage: i18n.language,
      });
    },
    onSuccess: (data) => {
      setAiDraft(data.draft);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to draft AI message"));
    },
  });

  const summarizeCommunicationMutation = useMutation({
    mutationFn: (input: {
      activityId?: string;
      dealId?: string;
      body: string;
      channelKey?: string;
      direction?: "INBOUND" | "OUTBOUND";
    }) =>
      crmApi.summarizeCommunicationAi({
        ...input,
        workspaceLanguage: i18n.language,
      }),
    onSuccess: (data) => {
      setSummaryResult(data);
      setSummaryError(null);
    },
    onError: (error) => {
      setSummaryError(getErrorMessage(error, "Failed to summarize communication"));
    },
  });

  const updateDeal = useUpdateDeal();
  const changeStage = useChangeDealStage();
  const markWon = useMarkDealWon();
  const markLost = useMarkDealLost();
  const addActivity = useAddDealActivity();
  const isOpen = deal?.status === "OPEN";

  const socialProfiles = useMemo(() => {
    const byPlatform: Record<string, string> = {};
    for (const link of party?.socialLinks ?? []) {
      byPlatform[link.platform] = link.url;
    }
    if (byPlatform.facebook) {
      byPlatform.facebook_messenger = byPlatform.facebook;
    }
    if (byPlatform.instagram) {
      byPlatform.instagram_dm = byPlatform.instagram;
    }
    if (byPlatform.x) {
      byPlatform.x_dm = byPlatform.x;
    }
    return byPlatform;
  }, [party?.socialLinks]);

  const contactContext = useMemo(() => {
    const displayName = party?.displayName || "";
    const [firstName, ...rest] = displayName.split(" ");
    const lastName = rest.join(" ");
    const profileUrl = socialProfiles.linkedin ?? party?.website ?? undefined;
    return {
      fullName: displayName,
      firstName,
      lastName,
      dealTitle: deal?.title,
      amount: deal?.amountCents ? (deal.amountCents / 100).toString() : undefined,
      currency: deal?.currency,
      email: party?.email,
      phoneE164: party?.phone,
      profileUrl,
      profileUrl_linkedin: socialProfiles.linkedin ?? profileUrl,
      profileUrl_facebook_messenger: socialProfiles.facebook_messenger ?? profileUrl,
      profileUrl_instagram_dm: socialProfiles.instagram_dm ?? profileUrl,
      profileUrl_x_dm: socialProfiles.x_dm ?? profileUrl,
      profileUrl_telegram: socialProfiles.telegram ?? profileUrl,
      profileUrl_wechat: socialProfiles.other ?? profileUrl,
      profileUrl_line: socialProfiles.other ?? profileUrl,
    };
  }, [party, deal, socialProfiles]);

  const invalidateDealData = (dealId: string) => {
    void queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
    void queryClient.invalidateQueries({ queryKey: ["deal", dealId, "timeline"] });
    void queryClient.invalidateQueries({ queryKey: dealQueryKeys.aiInsights(dealId) });
    void queryClient.invalidateQueries({ queryKey: dealQueryKeys.aiRecommendations(dealId) });
  };

  const ensureAiEnabledAndOnline = () => {
    if (!aiEnabled) {
      toast.error("CRM AI is disabled for this workspace.");
      return false;
    }
    if (offline) {
      toast.error("AI requires connection.");
      return false;
    }
    return true;
  };

  const openAiDraftForChannel = (
    channelKey: string,
    presetDraft?: CrmMessageDraft,
    autoGenerate = true
  ) => {
    setAiDraftChannelKey(channelKey);
    setAiDraft(presetDraft ?? null);
    setAiDraftOpen(true);

    if (presetDraft || !autoGenerate || !ensureAiEnabledAndOnline()) {
      return;
    }
    draftMessageMutation.mutate({
      channel: channelKey,
      personalizeWithTimeline: true,
      translateToWorkspaceLanguage: i18n.language !== "en",
    });
  };

  const runCommunicationSummary = (input: {
    activityId?: string;
    body: string;
    channelKey?: string;
    direction?: "INBOUND" | "OUTBOUND";
  }) => {
    if (!deal?.id || !aiEnabled || offline) {
      return;
    }
    summarizeCommunicationMutation.mutate({
      activityId: input.activityId,
      dealId: deal.id,
      body: input.body,
      channelKey: input.channelKey,
      direction: input.direction,
    });
  };

  const handleUpdateDetails = (patch: {
    notes?: string;
    probability?: number;
    expectedCloseDate?: string;
  }) => {
    if (!deal?.id) {
      return;
    }
    updateDeal.mutate({ dealId: deal.id, patch });
  };

  const handleQuickNote = (subject: string, body?: string) => {
    if (!deal?.id) {
      return;
    }
    addActivity.mutate(
      {
        dealId: deal.id,
        payload: {
          type: "NOTE",
          subject,
          body,
          partyId: deal.partyId ?? undefined,
        },
      },
      {
        onSuccess: (activity) => {
          runCommunicationSummary({
            activityId: activity.id,
            body: body?.trim() || subject,
            direction: "OUTBOUND",
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deal?.id) {
      return;
    }
    markLost.mutate(
      { dealId: deal.id, reason: lostReason || t("crm.deals.deletedReason") },
      {
        onSuccess: () => {
          navigate("/crm/deals");
        },
      }
    );
  };

  const handleMarkWon = () => {
    if (!deal || !isOpen) {
      toast.error(t("crm.deals.alreadyClosed"));
      return;
    }
    markWon.mutate(deal.id);
  };

  const handleMarkLost = () => {
    if (!deal || !isOpen) {
      toast.error(t("crm.deals.alreadyClosed"));
      return;
    }
    setLostDialogOpen(true);
  };

  const handleChangeStage = (stageId: string) => {
    if (!deal) {
      return;
    }
    if (!isOpen) {
      toast.error(t("crm.deals.alreadyClosed"));
      return;
    }
    changeStage.mutate({ dealId: deal.id, stageId });
  };

  const timelineItems = useMemo(() => {
    const baseItems = timelineData?.items ?? [];
    if (!timelineChannels.length) {
      return baseItems;
    }
    return baseItems.filter(
      (item) => item.channelKey && timelineChannels.includes(item.channelKey)
    );
  }, [timelineChannels, timelineData]);

  const templateContext = useMemo(
    () => ({
      ...contactContext,
      encodedMessage: "",
      message: "",
      subject: "",
    }),
    [contactContext]
  );

  const handleSelectChannel = (channel: ChannelDefinition) => {
    setSelectedChannel(channel);
    setComposerOpen(true);
  };

  const handleLogMessage = (payload: { subject?: string; body: string; openUrl?: string }) => {
    if (!deal || !selectedChannel) {
      return;
    }
    const onLogged = (activityId: string) => {
      invalidateDealData(deal.id);
      runCommunicationSummary({
        activityId,
        body: payload.body,
        channelKey: selectedChannel.key,
        direction: "OUTBOUND",
      });
    };

    if (selectedChannel.capabilities.canSendFromCRM && !selectedChannel.capabilities.manualOnly) {
      void crmApi
        .createCommunicationDraft({
          dealId: deal.id,
          channelKey: selectedChannel.key,
          direction: "OUTBOUND",
          status: "DRAFT",
          subject: payload.subject,
          body: payload.body,
          to: contactContext.email ? [contactContext.email] : undefined,
          participants: contactContext.phoneE164 ? [contactContext.phoneE164] : undefined,
        })
        .then((activity) => {
          onLogged(activity.id);
          toast.success(t("crm.channel.draftCreated"));
        })
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : t("crm.channel.createDraftFailed"));
        });
    } else {
      void crmApi
        .logCommunication({
          dealId: deal.id,
          channelKey: selectedChannel.key,
          direction: "OUTBOUND",
          status: "LOGGED",
          subject: payload.subject,
          body: payload.body,
          openUrl: payload.openUrl,
          to: contactContext.email ? [contactContext.email] : undefined,
          participants: contactContext.phoneE164 ? [contactContext.phoneE164] : undefined,
        })
        .then((activity) => {
          onLogged(activity.id);
          toast.success(t("crm.channel.messageLogged"));
        })
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : t("crm.channel.logFailed"));
        });
    }
    setComposerOpen(false);
  };

  const applyRecommendation = async (recommendation: DealAiRecommendation) => {
    if (!deal) {
      return;
    }
    try {
      if (recommendation.type === "scheduleTask") {
        const card = recommendation.toolCard;
        await crmApi.createActivity(card.payload, { idempotencyKey: card.idempotencyKey });
        toast.success(card.title);
      } else if (recommendation.type === "draftMessage") {
        const channel = channels?.find((item) => item.key === recommendation.channel) ?? null;
        setSelectedChannel(channel);
        openAiDraftForChannel(recommendation.channel, recommendation.toolCard.payload, false);
      } else if (recommendation.type === "meetingAgenda") {
        const channel = channels?.find((item) => item.key === "email") ?? null;
        setSelectedChannel(channel);
        openAiDraftForChannel("email", recommendation.toolCard.payload, false);
      } else if (recommendation.type === "stageMove") {
        const stageId = recommendation.toolCard.payload.stageId;
        if (stageId) {
          await crmApi.moveDealStage(deal.id, stageId);
          toast.success("Deal stage updated");
        }
      } else if (recommendation.type === "closeDateUpdate") {
        await crmApi.updateDeal(deal.id, {
          expectedCloseDate: recommendation.toolCard.payload.expectedCloseDate ?? undefined,
          probability: recommendation.toolCard.payload.probability ?? undefined,
        });
        toast.success("Deal details updated");
      }
      invalidateDealData(deal.id);
      setPendingRecommendation(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to apply AI recommendation"));
    }
  };

  const confirmFollowUpCreate = async () => {
    if (!pendingFollowUpToolCard) {
      return;
    }
    try {
      await crmApi.createActivity(pendingFollowUpToolCard.payload, {
        idempotencyKey: pendingFollowUpToolCard.idempotencyKey,
      });
      if (deal?.id) {
        invalidateDealData(deal.id);
      }
      toast.success("Follow-up activity created");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to create follow-up activity"));
    } finally {
      setPendingFollowUpToolCard(null);
    }
  };

  const insightsError =
    (refreshInsights.error ?? insightsQuery.error)
      ? getErrorMessage(refreshInsights.error ?? insightsQuery.error, "Failed to load AI insights")
      : null;
  const recommendationsError =
    (refreshRecommendations.error ?? recommendationsQuery.error)
      ? getErrorMessage(
          refreshRecommendations.error ?? recommendationsQuery.error,
          "Failed to load AI recommendations"
        )
      : null;

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 animate-fade-in">
        <DealSkeleton />
      </div>
    );
  }

  if (isError || !deal) {
    return (
      <div className="p-6 lg:p-8 space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-lg font-semibold">{t("crm.deals.loadFailed")}</p>
            <p className="text-muted-foreground">{t("crm.deals.loadFailedHint")}</p>
            <div className="flex gap-3">
              <Button variant="accent" onClick={() => refetch()}>
                {t("common.retry")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/crm/deals")}>
                {t("crm.deals.backToDeals")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in" data-testid="crm-deal-detail-page">
      <DealDetailMainContent
        deal={deal}
        stages={stages}
        isOpen={isOpen}
        detailsEditing={detailsEditing}
        onDetailsEditingChange={setDetailsEditing}
        onUpdateDetails={handleUpdateDetails}
        updateDealPending={updateDeal.isPending}
        health={insightsQuery.data?.health ?? null}
        onEditHeader={() => setDetailsEditing(true)}
        onChangeStage={handleChangeStage}
        onMarkWon={handleMarkWon}
        onMarkLost={handleMarkLost}
        onDelete={() => setDeleteDialogOpen(true)}
        timelineFilter={timelineFilter}
        onTimelineFilterChange={(value) => setTimelineFilter(value as TimelineFilter)}
        channels={channels ?? []}
        channelsLoading={channelsLoading}
        timelineChannels={timelineChannels}
        onToggleTimelineChannel={(channelKey) =>
          setTimelineChannels((prev) =>
            prev.includes(channelKey)
              ? prev.filter((key) => key !== channelKey)
              : [...prev, channelKey]
          )
        }
        timelineLoading={timelineLoading}
        timelineItems={timelineItems}
        aiEnabled={aiEnabled}
        offline={offline}
        insightsLoading={insightsQuery.isLoading || refreshInsights.isPending}
        insightsError={insightsError}
        insights={insightsQuery.data?.insights ?? null}
        onGenerateInsights={() => {
          if (!ensureAiEnabledAndOnline()) {
            return;
          }
          refreshInsights.mutate();
        }}
        recommendationsLoading={recommendationsQuery.isLoading || refreshRecommendations.isPending}
        recommendationsError={recommendationsError}
        recommendations={recommendationsQuery.data?.recommendations ?? []}
        onRefreshRecommendations={() => {
          if (!ensureAiEnabledAndOnline()) {
            return;
          }
          refreshRecommendations.mutate();
        }}
        onApplyRecommendation={(recommendation) => setPendingRecommendation(recommendation)}
        intentSentimentEnabled={Boolean(aiSettings?.settings.intentSentimentEnabled)}
        onToggleIntentSentiment={(enabled) => {
          updateAiSettings.mutate(
            { intentSentimentEnabled: enabled },
            {
              onSuccess: () => toast.success("AI setting updated"),
              onError: (error) =>
                toast.error(getErrorMessage(error, "Failed to update AI setting")),
            }
          );
        }}
        updateAiSettingsPending={updateAiSettings.isPending}
        summarizePending={summarizeCommunicationMutation.isPending}
        summaryError={summaryError}
        summaryResult={summaryResult}
        onSelectFollowUpToolCard={(toolCard) => setPendingFollowUpToolCard(toolCard)}
        onQuickNote={handleQuickNote}
        quickActionsDisabled={changeStage.isPending || markWon.isPending || markLost.isPending}
        onSelectChannel={handleSelectChannel}
        contactContext={contactContext}
      />

      <DealDetailOverlays
        deal={deal}
        selectedChannel={selectedChannel}
        activeWorkspaceId={activeWorkspaceId}
        composerOpen={composerOpen}
        onComposerOpenChange={setComposerOpen}
        templateContext={templateContext}
        contactContext={contactContext}
        onLogMessage={handleLogMessage}
        onOpenAiDraftFromComposer={() => {
          if (!selectedChannel) {
            return;
          }
          openAiDraftForChannel(selectedChannel.key);
        }}
        aiDisabled={!aiEnabled || offline}
        aiDraftOpen={aiDraftOpen}
        onAiDraftOpenChange={setAiDraftOpen}
        aiDraftLoading={draftMessageMutation.isPending}
        aiDraftChannelKey={aiDraftChannelKey}
        aiDraft={aiDraft}
        offline={offline}
        onGenerateDraft={({ personalizeWithTimeline, translateToWorkspaceLanguage }) => {
          if (!ensureAiEnabledAndOnline()) {
            return;
          }
          draftMessageMutation.mutate({
            channel: aiDraftChannelKey,
            personalizeWithTimeline,
            translateToWorkspaceLanguage,
          });
        }}
        onCopyDraft={(text) => {
          void navigator.clipboard
            .writeText(text)
            .then(() => toast.success("Copied to clipboard"))
            .catch(() => toast.error("Failed to copy draft"));
        }}
        onCreateFollowUpFromDraft={(subject, body) => {
          const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          dueAt.setHours(10, 0, 0, 0);
          setPendingFollowUpToolCard({
            toolCardType: "createActivity",
            title: `Create follow-up: ${subject}`,
            confirmationLabel: "Create follow-up",
            payload: {
              type: "TASK",
              subject,
              body,
              dealId: deal.id,
              partyId: deal.partyId ?? undefined,
              dueAt: dueAt.toISOString(),
            },
          });
        }}
        lostDialogOpen={lostDialogOpen}
        onLostDialogOpenChange={setLostDialogOpen}
        lostReason={lostReason}
        onLostReasonChange={setLostReason}
        onConfirmMarkLost={() => {
          markLost.mutate({ dealId: deal.id, reason: lostReason });
          setLostDialogOpen(false);
          setLostReason("");
        }}
        deleteDialogOpen={deleteDialogOpen}
        onDeleteDialogOpenChange={setDeleteDialogOpen}
        onPrepareDeleteReason={() => setLostReason(t("crm.deals.deletedReason"))}
        onConfirmDelete={() => {
          handleDelete();
          setDeleteDialogOpen(false);
        }}
        pendingRecommendation={pendingRecommendation}
        onPendingRecommendationOpenChange={(open) => {
          if (!open) {
            setPendingRecommendation(null);
          }
        }}
        onConfirmApplyRecommendation={() => {
          if (!pendingRecommendation) {
            return;
          }
          void applyRecommendation(pendingRecommendation);
        }}
        pendingFollowUpToolCard={pendingFollowUpToolCard}
        onPendingFollowUpOpenChange={(open) => {
          if (!open) {
            setPendingFollowUpToolCard(null);
          }
        }}
        onConfirmCreateFollowUp={() => {
          void confirmFollowUpCreate();
        }}
      />
    </div>
  );
}
