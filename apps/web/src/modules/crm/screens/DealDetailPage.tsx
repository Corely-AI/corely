import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@corely/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@corely/ui";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { Skeleton } from "@/shared/components/Skeleton";
import { DealHeader } from "../components/DealHeader";
import { DealDetailsCard } from "../components/DealDetailsCard";
import { DealQuickActions } from "../components/DealQuickActions";
import { DealMetaSidebar } from "../components/DealMetaSidebar";
import { ActivityComposer } from "../components/ActivityComposer";
import { TimelineView } from "../components/TimelineView";
import { ChannelComposerDrawer } from "../components/ChannelComposerDrawer";
import {
  type TimelineFilter,
  useAddDealActivity,
  useChangeDealStage,
  useDeal,
  useDealTimeline,
  useMarkDealLost,
  useMarkDealWon,
  usePipelineStages,
  useUpdateDeal,
} from "../hooks/useDeal";
import { useCrmChannels } from "../hooks/useChannels";
import { customersApi } from "@/lib/customers-api";
import { crmApi } from "@/lib/crm-api";
import type { ChannelDefinition } from "@corely/contracts";
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

export default function DealDetailPage() {
  const { t } = useTranslation();
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
  const queryClient = useQueryClient();

  const stages = usePipelineStages();
  const { data: deal, isLoading, isError, refetch } = useDeal(id);
  const { data: timelineData, isLoading: timelineLoading } = useDealTimeline(id, timelineFilter);
  const { data: channels, isLoading: channelsLoading, refetch: refetchChannels } = useCrmChannels();

  const { data: party } = useQuery({
    queryKey: ["deal-party", deal?.partyId],
    queryFn: () => customersApi.getCustomer(deal?.partyId as string),
    enabled: Boolean(deal?.partyId),
  });

  const updateDeal = useUpdateDeal();
  const changeStage = useChangeDealStage();
  const markWon = useMarkDealWon();
  const markLost = useMarkDealLost();
  const addActivity = useAddDealActivity();
  const isOpen = deal?.status === "OPEN";
  const contactContext = useMemo(() => {
    const displayName = party?.displayName || "";
    const [firstName, ...rest] = displayName.split(" ");
    const lastName = rest.join(" ");
    return {
      firstName,
      lastName,
      dealTitle: deal?.title,
      amount: deal?.amountCents ? (deal.amountCents / 100).toString() : undefined,
      currency: deal?.currency,
      email: party?.email,
      phoneE164: party?.phone,
      profileUrl: (party as any)?.profileUrl,
      profileUrl_linkedin: (party as any)?.profileUrl_linkedin ?? (party as any)?.profileUrl,
      profileUrl_facebook_messenger:
        (party as any)?.profileUrl_facebook_messenger ?? (party as any)?.profileUrl,
      profileUrl_instagram_dm:
        (party as any)?.profileUrl_instagram_dm ?? (party as any)?.profileUrl,
      profileUrl_x_dm: (party as any)?.profileUrl_x_dm ?? (party as any)?.profileUrl,
      profileUrl_telegram: (party as any)?.profileUrl_telegram ?? (party as any)?.profileUrl,
      profileUrl_wechat: (party as any)?.profileUrl_wechat ?? (party as any)?.profileUrl,
      profileUrl_line: (party as any)?.profileUrl_line ?? (party as any)?.profileUrl,
    };
  }, [party, deal]);

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
    addActivity.mutate({
      dealId: deal.id,
      payload: {
        type: "NOTE",
        subject,
        body,
        partyId: deal.partyId ?? undefined,
      },
    });
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
      toast.error("Deal is already closed");
      return;
    }
    markWon.mutate(deal.id);
  };

  const handleMarkLost = () => {
    if (!deal || !isOpen) {
      toast.error("Deal is already closed");
      return;
    }
    setLostDialogOpen(true);
  };

  const handleChangeStage = (stageId: string) => {
    if (!deal) {
      return;
    }
    if (!isOpen) {
      toast.error("Deal is already closed");
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
          if (activity.dealId) {
            void queryClient.invalidateQueries({ queryKey: ["deal", activity.dealId] });
            void queryClient.invalidateQueries({ queryKey: ["deal", activity.dealId, "timeline"] });
          }
          toast.success("Draft communication created");
        })
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Failed to create draft");
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
          if (activity.dealId) {
            void queryClient.invalidateQueries({ queryKey: ["deal", activity.dealId] });
            void queryClient.invalidateQueries({ queryKey: ["deal", activity.dealId, "timeline"] });
          }
          toast.success("Message logged");
        })
        .catch((error: unknown) => {
          toast.error(error instanceof Error ? error.message : "Failed to log message");
        });
    }
    setComposerOpen(false);
  };

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
      <DealHeader
        deal={deal}
        stages={stages}
        onEdit={() => setDetailsEditing(true)}
        onChangeStage={handleChangeStage}
        onMarkWon={handleMarkWon}
        onMarkLost={handleMarkLost}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DealDetailsCard
            deal={deal}
            onSave={handleUpdateDetails}
            isSaving={updateDeal.isPending}
            editing={detailsEditing}
            onEditingChange={setDetailsEditing}
          />

          <Card>
            <CardContent className="p-0">
              <Tabs
                value={timelineFilter}
                onValueChange={(val) => setTimelineFilter(val as TimelineFilter)}
              >
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
                {channels?.length ? (
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
                          onClick={() =>
                            setTimelineChannels((prev) =>
                              prev.includes(channel.key)
                                ? prev.filter((key) => key !== channel.key)
                                : [...prev, channel.key]
                            )
                          }
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
          <DealQuickActions
            deal={deal}
            stages={stages}
            onChangeStage={handleChangeStage}
            onMarkWon={handleMarkWon}
            onMarkLost={handleMarkLost}
            onQuickNote={handleQuickNote}
            onDelete={() => setDeleteDialogOpen(true)}
            disabled={changeStage.isPending || markWon.isPending || markLost.isPending || !isOpen}
            channels={channels}
            channelsLoading={channelsLoading}
            onSelectChannel={handleSelectChannel}
            contactContext={contactContext}
          />
          <DealMetaSidebar deal={deal} />
        </div>
      </div>

      <ChannelComposerDrawer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        channel={selectedChannel}
        context={{
          ...templateContext,
          dealTitle: deal.title,
          amount: deal.amountCents ? (deal.amountCents / 100).toString() : undefined,
          currency: deal.currency,
          email: contactContext.email,
          phoneE164: contactContext.phoneE164,
          profileUrl: contactContext.profileUrl,
        }}
        onLog={handleLogMessage}
      />

      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("crm.deals.markLostTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("crm.deals.markLostDescription")}</p>
            <Input
              placeholder={t("crm.deals.markLostPlaceholder")}
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              data-testid="crm-deal-lost-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLostDialogOpen(false)}
              data-testid="crm-deal-lost-cancel"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              data-testid="crm-deal-lost-confirm"
              onClick={() => {
                markLost.mutate({ dealId: deal.id, reason: lostReason });
                setLostDialogOpen(false);
                setLostReason("");
              }}
            >
              {t("crm.deals.markLost")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (open) {
            setLostReason(t("crm.deals.deletedReason"));
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("crm.deals.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("crm.deals.deleteDescription", { reason: t("crm.deals.deletedReason") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDelete();
                setDeleteDialogOpen(false);
              }}
            >
              {t("crm.deals.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
