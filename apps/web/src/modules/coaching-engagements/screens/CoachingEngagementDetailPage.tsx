import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { coachingApi } from "@/lib/coaching-api";
import { coachingKeys } from "../queries";

export const CoachingEngagementDetailPage = () => {
  const { t } = useTranslation();
  const { engagementId = "" } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: coachingKeys.detail(engagementId),
    queryFn: () => coachingApi.getEngagement(engagementId),
    enabled: Boolean(engagementId),
  });

  const checkoutMutation = useMutation({
    mutationFn: () => coachingApi.createCheckoutSession(engagementId),
    onSuccess: (result) => {
      window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
    },
    onError: () => toast.error(t("coaching.detail.checkoutError")),
  });

  const exportMutation = useMutation({
    mutationFn: () => coachingApi.requestExportBundle(engagementId),
    onSuccess: async () => {
      toast.success(t("coaching.detail.exportQueued"));
      await queryClient.invalidateQueries({ queryKey: coachingKeys.detail(engagementId) });
    },
    onError: () => toast.error(t("coaching.detail.exportError")),
  });

  if (isLoading || !data) {
    return <div>{t("common.loading")}</div>;
  }

  const { engagement, sessions, artifacts, timeline, aiSummary } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link to="/coaching/engagements">{t("coaching.engagements.title")}</Link>
          </div>
          <h1 className="text-2xl font-semibold">
            {engagement.offer.title[engagement.locale] ??
              engagement.offer.title.en ??
              engagement.id}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{engagement.status}</Badge>
            <Badge variant="secondary">{engagement.paymentStatus}</Badge>
            <Badge variant="outline">{engagement.contractStatus}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          {engagement.paymentStatus !== "captured" ? (
            <Button onClick={() => checkoutMutation.mutate()} disabled={checkoutMutation.isPending}>
              {t("coaching.detail.openCheckout")}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            {t("coaching.detail.exportBundle")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("coaching.detail.sections.overview")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Client: {engagement.clientPartyId}</div>
            <div>Coach user: {engagement.coachUserId}</div>
            <div>
              Offer price: {engagement.offer.priceCents / 100} {engagement.offer.currency}
            </div>
            <div>Invoice: {engagement.invoiceId ?? t("common.notSet")}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("coaching.detail.sections.workflow")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Status: {engagement.status}</div>
            <div>Payment: {engagement.paymentStatus}</div>
            <div>Contract: {engagement.contractStatus}</div>
            <div>
              Signed contract doc: {engagement.signedContractDocumentId ?? t("common.notSet")}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("coaching.detail.sections.sessions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {sessions.map((session) => (
              <div key={session.id} className="rounded border p-3">
                <div>{new Date(session.startAt).toLocaleString()}</div>
                <div>{session.status}</div>
                <div>{session.meetingLink ?? t("coaching.sessions.pendingMeeting")}</div>
                <div>Prep: {session.prepSubmittedAt ?? t("common.notSet")}</div>
                <div>Debrief: {session.debriefSubmittedAt ?? t("common.notSet")}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("coaching.detail.sections.documents")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {artifacts.map((artifact) => (
              <div key={artifact.document.id} className="rounded border p-3">
                <div className="font-medium">{artifact.title}</div>
                <div>{artifact.kind}</div>
                <div>{artifact.document.status}</div>
              </div>
            ))}
            {artifacts.length === 0 ? <div>{t("coaching.detail.noArtifacts")}</div> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("coaching.detail.sections.activity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {timeline.map((entry) => (
              <div key={entry.id} className="rounded border p-3">
                <div className="font-medium">{entry.eventType}</div>
                <div>{new Date(entry.occurredAt).toLocaleString()}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("coaching.detail.sections.aiSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {aiSummary ?? t("coaching.detail.noAiSummary")}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
