import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { coachingApi } from "@/lib/coaching-api";
import { coachingOfferKeys } from "../queries";
import { ConfirmDeleteDialog } from "@/shared/crud";
import { LoadingSkeleton, Badge, Button, Card, CardContent, Label } from "@corely/ui";

const getLocalizedValue = (
  value: Record<string, string> | null | undefined,
  localeDefault: string
) => {
  if (!value) {
    return "—";
  }
  return value[localeDefault] ?? value.en ?? Object.values(value)[0] ?? "—";
};

export default function CoachingOfferDetailPage() {
  const uiCopy = useUiCopy("ui.coaching-engagements-coachingofferdetailpage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { offerId } = useParams<{ offerId: string }>();

  const offerQuery = useQuery({
    queryKey: offerId ? coachingOfferKeys.detail(offerId) : ["coaching/offers", "missing-id"],
    queryFn: () => {
      if (!offerId) {
        throw new Error("Missing offer id");
      }
      return coachingApi.getOffer(offerId);
    },
    enabled: Boolean(offerId),
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      if (!offerId) {
        throw new Error("Missing offer id");
      }
      await coachingApi.archiveOffer(offerId);
    },
    onSuccess: async () => {
      toast.success(uiCopy("offer-archived"));
      await queryClient.invalidateQueries({ queryKey: coachingOfferKeys.all() });
      navigate("/coaching/offers");
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to archive offer");
    },
  });

  if (!offerId) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {uiCopy("missing-offer-id")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/coaching/offers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{uiCopy("coaching-offer")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {uiCopy("review-pricing-booking-rules")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/coaching/offers/${offerId}/edit`}>
              <Pencil className="h-4 w-4" />
              {uiCopy("edit")}
            </Link>
          </Button>
          <ConfirmDeleteDialog
            trigger={
              <Button variant="destructive" disabled={archiveMutation.isPending}>
                <Trash2 className="h-4 w-4" />
                {uiCopy("archive")}
              </Button>
            }
            title={uiCopy("archive-offer")}
            description={uiCopy("this-offer-will-be")}
            isLoading={archiveMutation.isPending}
            onConfirm={async () => {
              await archiveMutation.mutateAsync();
            }}
          />
        </div>
      </div>

      {offerQuery.isLoading ? (
        <LoadingSkeleton variant="detail" label={uiCopy("loading-offer")} />
      ) : null}

      {offerQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">{uiCopy("failed-to-load-offer")}</div>
            <Button variant="outline" size="sm" onClick={() => void offerQuery.refetch()}>
              {uiCopy("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {offerQuery.data ? (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Label>{uiCopy("title")}</Label>
                <p className="text-base mt-1">
                  {getLocalizedValue(offerQuery.data.title, offerQuery.data.localeDefault)}
                </p>
              </div>
              <Badge variant={offerQuery.data.archivedAt ? "secondary" : "outline"}>
                {offerQuery.data.archivedAt ? uiCopy("archived") : uiCopy("active")}
              </Badge>
            </div>

            <div>
              <Label>{uiCopy("description")}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {getLocalizedValue(offerQuery.data.description, offerQuery.data.localeDefault)}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>{uiCopy("price")}</Label>
                <p className="mt-1">
                  {offerQuery.data.priceCents} {offerQuery.data.currency}
                </p>
              </div>
              <div>
                <Label>{uiCopy("duration")}</Label>
                <p className="mt-1">
                  {offerQuery.data.sessionDurationMinutes}
                  {" " + uiCopy("minutes")}
                </p>
              </div>
              <div>
                <Label>{uiCopy("meeting-type")}</Label>
                <p className="mt-1">{offerQuery.data.meetingType}</p>
              </div>
              <div>
                <Label>{uiCopy("timezone")}</Label>
                <p className="mt-1">{offerQuery.data.availabilityRule.timezone}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>{uiCopy("min-notice")}</Label>
                <p className="mt-1">
                  {offerQuery.data.bookingRules.minNoticeHours}
                  {" " + uiCopy("hours")}
                </p>
              </div>
              <div>
                <Label>{uiCopy("max-advance")}</Label>
                <p className="mt-1">
                  {offerQuery.data.bookingRules.maxAdvanceDays}
                  {" " + uiCopy("days")}
                </p>
              </div>
              <div>
                <Label>{uiCopy("buffer-before")}</Label>
                <p className="mt-1">
                  {offerQuery.data.bookingRules.bufferBeforeMinutes}
                  {" " + uiCopy("minutes")}
                </p>
              </div>
              <div>
                <Label>{uiCopy("buffer-after")}</Label>
                <p className="mt-1">
                  {offerQuery.data.bookingRules.bufferAfterMinutes}
                  {" " + uiCopy("minutes")}
                </p>
              </div>
            </div>

            <div>
              <Label>{uiCopy("weekly-availability")}</Label>
              <div className="mt-2 space-y-2">
                {offerQuery.data.availabilityRule.weeklySlots.length ? (
                  offerQuery.data.availabilityRule.weeklySlots.map((slot) => (
                    <div
                      key={`${slot.dayOfWeek}-${slot.startTime}`}
                      className="text-sm text-muted-foreground"
                    >
                      {uiCopy("day") + " "}
                      {slot.dayOfWeek}: {slot.startTime} - {slot.endTime}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {uiCopy("no-weekly-availability-configured")}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label>{uiCopy("contract-template")}</Label>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground mt-1">
                {getLocalizedValue(offerQuery.data.contractTemplate, offerQuery.data.localeDefault)}
              </p>
            </div>

            <div>
              <Label>{uiCopy("prep-form")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(offerQuery.data.prepFormTemplate?.questions ?? []).length ? (
                  offerQuery.data.prepFormTemplate?.questions.map((question) => (
                    <Badge key={question.key} variant="outline">
                      {getLocalizedValue(question.label, offerQuery.data.localeDefault)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {uiCopy("no-prep-form-questions")}
                  </span>
                )}
              </div>
            </div>

            <div>
              <Label>{uiCopy("debrief-form")}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(offerQuery.data.debriefTemplate?.questions ?? []).length ? (
                  offerQuery.data.debriefTemplate?.questions.map((question) => (
                    <Badge key={question.key} variant="outline">
                      {getLocalizedValue(question.label, offerQuery.data.localeDefault)}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {uiCopy("no-debrief-form-questions")}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
