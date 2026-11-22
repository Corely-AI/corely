import { useCallback, useEffect, useState } from "react";
import { Button } from "@corely/ui";
import {
  AppointmentReviewSchema,
  type AppointmentReview,
  type AppointmentReviewDecision,
} from "@corely/contracts";
import { Link } from "react-router-dom";
import { api } from "../../shared/api";
import { useLanguage } from "../../shared/i18n";
import { Loading } from "../../shared/ui";

const wording = {
  en: {
    title: "Review appointment change",
    message: "Review customer email",
    reference: "Booking",
    current: "Current appointment",
    replacement: "Proposed appointment",
    expires: "Review expires",
    recipient: "Recipient",
    subject: "Subject",
    body: "Message",
    approve: "Approve exact details",
    reject: "Reject",
    refresh: "Refresh status",
    schedule: "Back to studio",
    denied: "The review could not be loaded in this workspace.",
    failure: "The decision could not be saved. Refresh the review before trying again.",
    handoff: "Use the CLI to apply the approved action.",
    absence: "The current appointment overlaps approved staff unavailability.",
    delivery: "Email delivery",
    timezone: "Timezone",
    states: {
      pending: "Pending review",
      approved: "Approved",
      rejected: "Rejected",
      expired: "Expired",
      stale: "Details changed",
      applied: "Applied",
      failed: "Apply failed",
    },
    deliveryStates: {
      pending: "Queued",
      accepted: "Accepted by provider",
      failed: "Delivery failed",
      superseded: "Superseded",
    },
  },
  de: {
    title: "Terminänderung prüfen",
    message: "Kunden-E-Mail prüfen",
    reference: "Buchung",
    current: "Aktueller Termin",
    replacement: "Vorgeschlagener Termin",
    expires: "Freigabe möglich bis",
    recipient: "Empfänger",
    subject: "Betreff",
    body: "Nachricht",
    approve: "Gezeigte Angaben freigeben",
    reject: "Ablehnen",
    refresh: "Status aktualisieren",
    schedule: "Zurück zum Studio",
    denied: "Die Anfrage konnte in diesem Workspace nicht geladen werden.",
    failure: "Die Entscheidung konnte nicht gespeichert werden. Laden Sie die Anfrage erneut.",
    handoff: "Die freigegebene Aktion kann über die CLI ausgeführt werden.",
    absence: "Der aktuelle Termin überschneidet sich mit einer genehmigten Abwesenheit.",
    delivery: "E-Mail-Zustellung",
    timezone: "Zeitzone",
    states: {
      pending: "Freigabe ausstehend",
      approved: "Freigegeben",
      rejected: "Abgelehnt",
      expired: "Abgelaufen",
      stale: "Angaben geändert",
      applied: "Ausgeführt",
      failed: "Ausführung fehlgeschlagen",
    },
    deliveryStates: {
      pending: "In der Warteschlange",
      accepted: "Vom Anbieter angenommen",
      failed: "Zustellung fehlgeschlagen",
      superseded: "Überholt",
    },
  },
  vi: {
    title: "Xem xét thay đổi lịch hẹn",
    message: "Xem xét email gửi khách",
    reference: "Đặt lịch",
    current: "Lịch hẹn hiện tại",
    replacement: "Lịch hẹn đề xuất",
    expires: "Hạn phê duyệt",
    recipient: "Người nhận",
    subject: "Chủ đề",
    body: "Nội dung",
    approve: "Phê duyệt nội dung này",
    reject: "Từ chối",
    refresh: "Cập nhật trạng thái",
    schedule: "Quay lại studio",
    denied: "Không thể tải yêu cầu trong không gian làm việc này.",
    failure: "Không thể lưu quyết định. Hãy tải lại yêu cầu trước khi thử lại.",
    handoff: "Dùng CLI để thực hiện hành động đã được phê duyệt.",
    absence: "Lịch hẹn hiện tại trùng với thời gian vắng mặt đã được phê duyệt.",
    delivery: "Gửi email",
    timezone: "Múi giờ",
    states: {
      pending: "Chờ phê duyệt",
      approved: "Đã phê duyệt",
      rejected: "Đã từ chối",
      expired: "Hết hạn",
      stale: "Thông tin đã thay đổi",
      applied: "Đã thực hiện",
      failed: "Thực hiện thất bại",
    },
    deliveryStates: {
      pending: "Đang chờ gửi",
      accepted: "Nhà cung cấp đã nhận",
      failed: "Gửi thất bại",
      superseded: "Đã thay thế",
    },
  },
};

export type AppointmentReviewClient = {
  read(): Promise<AppointmentReview>;
  decide(input: AppointmentReviewDecision): Promise<AppointmentReview>;
};

export function appointmentReviewClient(id: string, workspaceId: string): AppointmentReviewClient {
  const endpoint = `/openbuk/appointment-reviews/${encodeURIComponent(id)}`;
  const headers = { "X-Workspace-Id": workspaceId, "Content-Type": "application/json" };
  const scope = { workspaceScope: "none" as const };
  return {
    read: async () =>
      AppointmentReviewSchema.parse(await api.request(endpoint, { headers }, scope)),
    decide: async (input) =>
      AppointmentReviewSchema.parse(
        await api.request(
          `${endpoint}/decision`,
          { headers, method: "POST", body: JSON.stringify(input) },
          scope
        )
      ),
  };
}

export function ReviewUnavailable() {
  const { locale } = useLanguage();
  return (
    <p className="my-6" role="alert">
      {wording[locale].denied}
    </p>
  );
}

export function AppointmentReviewPanel({
  client,
  workspaceName,
}: {
  client: AppointmentReviewClient;
  workspaceName: string;
}) {
  const { locale } = useLanguage();
  const labels = wording[locale];
  const [review, setReview] = useState<AppointmentReview | null>(null);
  const [loadingFailed, setLoadingFailed] = useState(false);
  const [actionFailed, setActionFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    setActionFailed(false);
    try {
      setReview(await client.read());
      setLoadingFailed(false);
    } catch {
      setReview(null);
      setLoadingFailed(true);
    } finally {
      setBusy(false);
    }
  }, [client]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(decision: AppointmentReviewDecision["decision"]) {
    if (!review || busy) {
      return;
    }
    setBusy(true);
    setActionFailed(false);
    try {
      setReview(await client.decide({ decision, digest: review.digest }));
    } catch {
      setActionFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const action = review?.action;
  const timezone = action?.kind === "replacement" ? action.payload.timezone : undefined;
  const date = new Intl.DateTimeFormat(locale, {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
  });
  const period = (startAt: string, endAt: string) =>
    `${date.format(new Date(startAt))} – ${date.format(new Date(endAt))}`;

  return (
    <section className="mx-auto my-4 w-full max-w-3xl space-y-5 rounded-xl border bg-background p-4 text-foreground sm:p-8">
      <Link to="/openbuk/app" className="text-sm underline">
        {labels.schedule}
      </Link>
      <div>
        <p className="break-words text-sm text-muted-foreground">{workspaceName}</p>
        <h1 className="text-2xl font-semibold">
          {action?.kind === "message" ? labels.message : labels.title}
        </h1>
      </div>
      {loadingFailed ? <ReviewUnavailable /> : null}
      {!review && !loadingFailed ? <Loading /> : null}
      {review && action ? (
        <>
          <div role="status" className="space-y-1">
            <p className="font-semibold">{labels.states[review.state]}</p>
            <p className="text-sm text-muted-foreground">
              {labels.expires} · {date.format(new Date(review.expiresAt))}
            </p>
            {review.state === "approved" ? <p>{labels.handoff}</p> : null}
            {review.delivery ? (
              <p>
                {labels.delivery} · {labels.deliveryStates[review.delivery.state]}
              </p>
            ) : null}
          </div>
          <dl className="grid gap-4 rounded-lg border p-4 text-sm">
            {action.kind === "replacement" ? (
              <>
                <div>
                  <dt className="font-semibold">{labels.reference}</dt>
                  <dd>{action.payload.reference}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{labels.current}</dt>
                  <dd>
                    {period(action.payload.current.startAt, action.payload.current.endAt)} ·{" "}
                    {action.payload.current.resourceName}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold">{labels.replacement}</dt>
                  <dd>
                    {period(action.payload.replacement.startAt, action.payload.replacement.endAt)} ·{" "}
                    {action.payload.replacement.resourceName}
                  </dd>
                </div>
                <div>
                  <dt className="sr-only">{labels.timezone}</dt>
                  <dd>{action.payload.timezone}</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="font-semibold">{labels.recipient}</dt>
                  <dd className="break-all">{action.payload.recipient}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{labels.subject}</dt>
                  <dd className="break-words">{action.payload.subject}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{labels.body}</dt>
                  <dd className="whitespace-pre-wrap break-words">{action.payload.body}</dd>
                </div>
              </>
            )}
          </dl>
          {action.kind === "replacement" && action.payload.absenceImpact ? (
            <p>{labels.absence}</p>
          ) : null}
        </>
      ) : null}
      {actionFailed ? <p role="alert">{labels.failure}</p> : null}
      <div className="flex flex-wrap gap-2">
        {review?.state === "pending" ? (
          <>
            <Button disabled={busy || actionFailed} onClick={() => void decide("approve")}>
              {labels.approve}
            </Button>
            <Button
              variant="outline"
              disabled={busy || actionFailed}
              onClick={() => void decide("reject")}
            >
              {labels.reject}
            </Button>
          </>
        ) : null}
        <Button variant="outline" disabled={busy} onClick={() => void refresh()}>
          {labels.refresh}
        </Button>
      </div>
    </section>
  );
}
