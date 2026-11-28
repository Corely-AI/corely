import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Input, LoadingSkeleton } from "@corely/ui";
import {
  AppointmentReviewIdSchema,
  type AppointmentReview,
  EmployeeTaskListSchema,
  type EmployeeTask,
  OperationalPlanRequestSchema,
  OperationalPlanResponseSchema,
  type OperationalPlanResponse,
} from "@corely/contracts";
import { api } from "../../shared/api";
import { useLanguage } from "../../shared/i18n";
import { appointmentReviewClient, reviewStateLabel } from "./appointment-review";

const copy = {
  en: {
    title: "Review operational plan",
    back: "Back to studio",
    appointment: "Booking ID",
    startsAt: "Proposed time",
    task: "Task ID to complete",
    preview: "Preview changes",
    note: "Customer message note",
    scheduled: "Reminder time (optional)",
    timezone: "Times entered here use",
    failed: "The changes could not be previewed. Check the details and try again.",
    retryAction: "This change could not be previewed. Try again to recover the proposed action.",
    unavailable:
      "This change is no longer available. Check the current record and create a new proposal.",
    move: "Review the appointment change",
    done: "Review the task completion",
    email: "Review the customer email",
  },
  de: {
    title: "Betriebsplan prüfen",
    back: "Zurück zum Studio",
    appointment: "Buchungs-ID",
    startsAt: "Vorgeschlagener Zeitpunkt",
    task: "ID der abzuschließenden Aufgabe",
    preview: "Änderungen ansehen",
    note: "Zusatz für die Kunden-E-Mail",
    scheduled: "Erinnerungszeit (optional)",
    timezone: "Eingaben verwenden die Zeitzone",
    failed:
      "Die Vorschau konnte nicht erstellt werden. Prüfen Sie die Angaben und versuchen Sie es erneut.",
    retryAction: "Die Vorschau dieser Änderung ist fehlgeschlagen. Versuchen Sie es erneut.",
    unavailable:
      "Diese Änderung ist nicht mehr verfügbar. Prüfen Sie den aktuellen Eintrag und erstellen Sie einen neuen Vorschlag.",
    move: "Terminänderung prüfen",
    done: "Aufgabenabschluss prüfen",
    email: "Kunden-E-Mail prüfen",
  },
  vi: {
    title: "Xem xét kế hoạch vận hành",
    back: "Quay lại studio",
    appointment: "Mã đặt lịch",
    startsAt: "Giờ đề xuất",
    task: "Mã công việc cần hoàn thành",
    preview: "Xem trước thay đổi",
    note: "Ghi chú cho email gửi khách",
    scheduled: "Giờ nhắc (không bắt buộc)",
    timezone: "Thời gian nhập dùng múi giờ",
    failed: "Không thể xem trước thay đổi. Hãy kiểm tra và thử lại.",
    retryAction: "Không thể xem trước thay đổi này. Hãy thử lại.",
    unavailable: "Thay đổi không còn khả dụng. Hãy xem hồ sơ mới nhất và tạo đề xuất mới.",
    move: "Xem xét thay đổi lịch hẹn",
    done: "Xem xét hoàn thành công việc",
    email: "Xem xét email gửi khách",
  },
} as const;

function actionLabel(action: AppointmentReview["action"]) {
  switch (action.kind) {
    case "replacement":
      return action.payload.reference;
    case "task":
      return action.payload.title;
    case "message":
      return action.payload.recipient;
  }
}

export function OperationsPlanForm({ workspaceId }: { workspaceId: string }) {
  const { locale } = useLanguage();
  const t = locale === "de" ? copy.de : locale === "vi" ? copy.vi : copy.en;
  const [query, setQuery] = useSearchParams();
  const plan = query.get("plan");
  const replacement = query.get("replacement");
  const confirmation = query.get("confirmation");
  const email = Boolean(replacement || confirmation);
  const [preview, setPreview] = useState<OperationalPlanResponse>();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [work, setWork] = useState<EmployeeTask[]>([]);
  const keys = useRef(new Map<string, string>());
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    if (email) {
      return;
    }
    const controller = new AbortController();
    void api
      .request(
        "/tasks?status=OPEN&page=1&pageSize=50",
        {
          headers: { "X-Workspace-Id": workspaceId },
        },
        { workspaceScope: "none", signal: controller.signal }
      )
      .then((list) => {
        if (!controller.signal.aborted) {
          setWork(EmployeeTaskListSchema.parse(list).items);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setWork([]);
        }
      });
    return () => controller.abort();
  }, [workspaceId, email]);

  useEffect(() => {
    const ids = plan
      ?.split(",")
      .filter((id) => AppointmentReviewIdSchema.safeParse(id).success)
      .slice(0, 10);
    if (!ids?.length) {
      setPreview(undefined);
      return;
    }
    let active = true;
    void Promise.all(
      ids.map(async (id, index) => {
        try {
          return { index, review: await appointmentReviewClient(id, workspaceId).read() };
        } catch {
          return { index, error: "action-unavailable" as const };
        }
      })
    ).then((actions) => {
      if (active) {
        setPreview({ actions });
      }
    });
    return () => {
      active = false;
    };
  }, [confirmation, plan, replacement, workspaceId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) {
      return;
    }
    setBusy(true);
    setFailed(false);
    setPreview(undefined);
    try {
      const fields = new FormData(event.currentTarget);
      const value = (name: string) => String(fields.get(name) ?? "").trim();
      const time = (name: string) => new Date(value(name)).toISOString();
      const actions: unknown[] = [];
      if (replacement || confirmation) {
        actions.push({
          ...(replacement
            ? { kind: "message", replacementId: replacement }
            : { kind: "confirmation", bookingId: confirmation }),
          note: value("note"),
          ...(value("scheduled") ? { scheduledFor: time("scheduled") } : {}),
        });
      } else {
        if (value("booking") || value("start")) {
          actions.push({
            kind: "replacement",
            request: { bookingId: value("booking"), startAt: time("start") },
          });
        }
        if (value("task")) {
          actions.push({ kind: "task", taskId: value("task") });
        }
      }
      const signature = JSON.stringify(actions);
      const key = keys.current.get(signature) ?? crypto.randomUUID();
      keys.current.set(signature, key);
      const data = OperationalPlanRequestSchema.parse({ actions, key });
      const response = await api.request(
        "/openbuk/appointment-reviews/proposals",
        {
          method: "POST",
          headers: { "X-Workspace-Id": workspaceId, "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
        { workspaceScope: "none" }
      );
      const result = OperationalPlanResponseSchema.parse(response);
      setPreview(result);
      const ids = result.actions.flatMap((action) =>
        "review" in action ? [action.review.id] : []
      );
      if (ids.length && ids.length === result.actions.length) {
        const updated = new URLSearchParams(query);
        updated.set("plan", ids.join(","));
        setQuery(updated, { replace: true });
        keys.current.delete(signature);
      }
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto my-4 w-full max-w-3xl space-y-5 rounded-xl border bg-background p-4 text-foreground sm:p-8">
      <Link to="/openbuk/app" className="text-sm underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <form className="space-y-4" onSubmit={(event) => void submit(event)} aria-busy={busy}>
        <p className="text-sm text-muted-foreground">
          {t.timezone} {timezone}
        </p>
        {email ? (
          <>
            <label className="block space-y-1">
              {t.note}
              <Input name="note" maxLength={1000} />
            </label>
            <label className="block space-y-1">
              {t.scheduled}
              <Input name="scheduled" type="datetime-local" />
            </label>
          </>
        ) : (
          <>
            <label className="block space-y-1">
              {t.appointment}
              <Input name="booking" defaultValue={query.get("booking") ?? ""} maxLength={36} />
            </label>
            <label className="block space-y-1">
              {t.startsAt}
              <Input name="start" type="datetime-local" />
            </label>
            <div className="space-y-1">
              <label htmlFor="operational-plan-task">{t.task}</label>
              <Input
                id="operational-plan-task"
                name="task"
                maxLength={36}
                list="operational-plan-tasks"
              />
            </div>
            <datalist id="operational-plan-tasks">
              {work.map((task) => (
                <option value={task.id} key={task.id} label={task.title} />
              ))}
            </datalist>
          </>
        )}
        <Button type="submit" disabled={busy}>
          {t.preview}
        </Button>
      </form>
      {busy && <LoadingSkeleton label={t.preview} variant="list" />}
      {failed && <p role="alert">{t.failed}</p>}
      {preview && (
        <ul className="space-y-3" aria-live="polite">
          {preview.actions.map((row) => (
            <li key={row.index} className="rounded-md border p-3">
              {"review" in row ? (
                <Link
                  className="underline"
                  to={
                    "/openbuk/app/reviews/" +
                    encodeURIComponent(row.review.id) +
                    "?" +
                    new URLSearchParams({ workspaceId })
                  }
                >
                  {row.review.action.kind === "replacement"
                    ? t.move
                    : row.review.action.kind === "task"
                      ? t.done
                      : t.email}
                </Link>
              ) : "error" in row && row.error === "temporarily-unavailable" ? (
                t.retryAction
              ) : (
                t.unavailable
              )}
              {"review" in row ? (
                <span className="ml-2 text-sm text-muted-foreground">
                  {actionLabel(row.review.action)} · {reviewStateLabel(locale, row.review.state)}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
