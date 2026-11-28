import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { OperationsTodaySchema, type OperationsToday } from "@corely/contracts";
import { Badge, Button, Card, CardContent, CardHeader, LoadingSkeleton } from "@corely/ui";
import { apiClient } from "@corely/web-shared/lib/api-client";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";
import localized from "./operations-today-copy.json";

type Copy = typeof localized.en;
type Row = { id: string; href: string; title: string; detail?: string };

export function OperationsTodayPage() {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const language = locale.split("-")[0];
  const copy = language === "de" ? localized.de : language === "vi" ? localized.vi : localized.en;
  const { user } = useAuth();
  const { activeWorkspaceId, isInitialLoading } = useWorkspace();
  const query = useQuery({
    queryKey: ["operations-today", user?.activeTenantId, activeWorkspaceId, user?.userId],
    enabled: Boolean(activeWorkspaceId && user?.userId),
    queryFn: async ({ signal }) => {
      const today = OperationsTodaySchema.parse(
        await apiClient.request(
          "/operations/today",
          { method: "GET", headers: { "X-Workspace-Id": activeWorkspaceId! } },
          { workspaceScope: "none", signal }
        )
      );
      if (today.workspaceId !== activeWorkspaceId) {
        throw new Error("Unexpected workspace in today's response");
      }
      return today;
    },
    meta: { persist: false },
    retry: false,
  });
  const data = !query.error ? query.data : undefined;
  const date =
    data &&
    new Intl.DateTimeFormat(locale, {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(new Date(data.date + "T00:00:00Z"));

  let content: ReactNode;
  if (isInitialLoading || (activeWorkspaceId && user?.userId && query.isPending)) {
    content = <LoadingSkeleton variant="cards" label={copy.loading} />;
  } else if (!activeWorkspaceId || !user?.userId) {
    content = (
      <p role="alert" className="text-sm">
        {copy.signIn}
      </p>
    );
  } else if (data) {
    content = <TodaySources data={data} copy={copy} locale={locale} />;
  } else {
    content = (
      <p role="alert" className="text-sm">
        {copy.fetchError}
      </p>
    );
  }
  return (
    <section
      className="mx-auto w-full max-w-6xl space-y-6 p-4 pt-6 sm:p-8"
      aria-labelledby="today-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 id="today-heading" className="text-3xl font-semibold tracking-tight">
            {copy.title}
          </h1>
          {data && (
            <p className="text-sm text-muted-foreground">
              <time dateTime={data.date}>{date}</time>
              {" · "}
              {data.timezoneSource === "utc" ? copy.utc : data.timezone}
            </p>
          )}
        </div>
        {activeWorkspaceId && user?.userId && (
          <Button
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            {copy.refresh}
          </Button>
        )}
      </header>
      <div aria-busy={query.isFetching}>{content}</div>
    </section>
  );
}

const statuses = {
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  CANCELED: "cancelled",
  COMPLETED: "completed",
  OPEN: "open",
  HOLD: "reserved",
  PENDING: "reserved",
  SUBMITTED: "submitted",
  RETURNED: "returned",
  PENDING_APPLICATION: "pending",
  FAILED_APPLICATION: "failed",
} as const satisfies Record<string, keyof Copy>;

function label(status: string, copy: Copy) {
  return copy[statuses[status as keyof typeof statuses] ?? "unknownStatus"];
}

function TodaySources({
  data,
  copy,
  locale,
}: {
  data: OperationsToday;
  copy: Copy;
  locale: string;
}) {
  const time = new Intl.DateTimeFormat(locale, { timeStyle: "short", timeZone: data.timezone });
  const clockTime = (iso: string) => time.format(new Date(iso));
  const kinds = { ABSENCE: copy.absence, EQUIPMENT: copy.equipment, GENERAL: copy.general };
  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <SourceCard
        title={copy.appointments}
        source={data.appointments}
        browse={{ label: copy.openSchedule, href: "/openbuk/app/calendar" }}
        rows={data.appointments.items.map((appointment) => ({
          id: appointment.id,
          href: appointment.href,
          title: clockTime(appointment.startAt),
          detail: label(appointment.status, copy),
        }))}
        copy={copy}
        locale={locale}
      />
      <SourceCard
        title={copy.tasks}
        source={data.tasks}
        browse={{ label: copy.openTasks, href: "/tasks" }}
        rows={data.tasks.items.map((task) => ({
          id: task.id,
          href: task.href,
          title: task.title,
          detail: `${label(task.status, copy)} · ${clockTime(task.dueAt)}`,
        }))}
        copy={copy}
        locale={locale}
      />
      <SourceCard
        title={copy.decisions}
        source={data.decisions}
        browse={{ label: copy.openRequests, href: "/requests" }}
        rows={data.decisions.items.map((request) => ({
          id: request.id,
          href: request.href,
          title: kinds[request.kind],
          detail: label(request.status, copy),
        }))}
        copy={copy}
        locale={locale}
      />
      <SourceCard
        title={copy.exceptions}
        source={data.exceptions}
        browse={{ label: copy.openSchedule, href: "/openbuk/app/calendar" }}
        rows={data.exceptions.items.map((exception) => ({
          id: exception.appointmentId,
          href: exception.href,
          title: copy.coverage,
          detail: clockTime(exception.startAt),
        }))}
        copy={copy}
        locale={locale}
      />
    </div>
  );
}

function SourceCard({
  title,
  source,
  rows,
  browse,
  copy,
  locale,
}: {
  title: string;
  source:
    | OperationsToday["appointments"]
    | OperationsToday["tasks"]
    | OperationsToday["decisions"]
    | OperationsToday["exceptions"];
  rows: Row[];
  browse: { label: string; href: string };
  copy: Copy;
  locale: string;
}) {
  const { status, total, observedAt } = source;
  const hasRows = total !== null;
  const lastChecked =
    observedAt &&
    new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(observedAt));
  return (
    <Card className="min-w-0">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {hasRows && (
            <Badge variant="secondary">{new Intl.NumberFormat(locale).format(total)}</Badge>
          )}
        </div>
        {status !== "fresh" && (
          <p role="status" className="text-sm text-muted-foreground">
            {copy[status]}
          </p>
        )}
        {observedAt && (
          <p className="text-xs text-muted-foreground">
            {copy.asOf} <time dateTime={observedAt}>{lastChecked}</time>
          </p>
        )}
      </CardHeader>
      {hasRows && (
        <CardContent className="space-y-4">
          {rows.length > 0 ? (
            <ul className="divide-y divide-border" aria-label={title}>
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    className="block break-words rounded px-2 py-2 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    to={row.href}
                  >
                    <span className="font-medium">{row.title}</span>
                    {row.detail && <p className="text-sm text-muted-foreground">{row.detail}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {status === "fresh" ? copy.empty : copy.noVisible}
            </p>
          )}
          {total > rows.length && <p className="text-xs text-muted-foreground">{copy.preview}</p>}
          <Button variant="outline" size="sm" asChild>
            <Link to={browse.href}>{browse.label}</Link>
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
