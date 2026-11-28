import {
  OperationalRequestQueueStatusSchema,
  type OperationalRequestQueueStatus,
  type OperationalRequestsPage,
} from "@corely/contracts";
import { Badge, Button, Card, CardContent, Label } from "@corely/ui";
import { useId } from "react";
import { Link } from "react-router-dom";
import { kindLabel } from "./request-draft-fields";
import { formatAge, formatDate, queueStatusLabel, type RequestsCopy } from "./requests-copy";

const reviewerStatuses = ["SUBMITTED", "PENDING_APPLICATION", "FAILED_APPLICATION"] as const;

export function RequestQueue({
  result,
  inbox,
  copy,
  locale,
  page,
  filter,
  refreshing,
  onRefresh,
  onFilter,
  onPage,
}: {
  result: OperationalRequestsPage;
  inbox: boolean;
  copy: RequestsCopy;
  locale: string;
  page: number;
  filter: OperationalRequestQueueStatus | undefined;
  refreshing: boolean;
  onRefresh: () => void;
  onFilter: (value: string) => void;
  onPage: (page: number) => void;
}) {
  const filterId = useId();
  const statuses = inbox ? reviewerStatuses : OperationalRequestQueueStatusSchema.options;
  const all = Object.values(result.counts ?? {}).reduce((total, count) => total + (count ?? 0), 0);
  const number = new Intl.NumberFormat(locale);
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid max-w-full gap-1 text-sm font-medium">
          <Label htmlFor={filterId}>{copy.queueFilter}</Label>
          <select
            id={filterId}
            className="h-10 w-full rounded-md border border-input bg-background px-3"
            value={filter ?? ""}
            onChange={(event) => onFilter(event.target.value)}
          >
            <option value="">
              {copy.queueAll}
              {result.counts ? ` (${number.format(all)})` : ""}
            </option>
            {statuses.map((status) => (
              <option value={status} key={status}>
                {queueStatusLabel(status, copy)} ({number.format(result.counts?.[status] ?? 0)})
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" onClick={onRefresh} disabled={refreshing}>
          {copy.queueRefresh}
        </Button>
      </div>
      {result.sourceUnavailable && (
        <p role="status" className="rounded-md border border-border p-3 text-sm">
          {copy.sourcePartial}
        </p>
      )}
      {result.evaluatedAt && (
        <p role="status" className="text-sm text-muted-foreground">
          {refreshing
            ? copy.queueRefreshing
            : `${copy.queueUpdated} ${new Intl.DateTimeFormat(locale, {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(result.evaluatedAt))}`}
        </p>
      )}
      <Card aria-busy={refreshing}>
        <CardContent className="p-0">
          {result.items.length ? (
            <ul
              className="divide-y divide-border"
              aria-label={inbox ? copy.inbox : copy.myRequests}
            >
              {result.items.map((request) => {
                const status = request.queueStatus ?? request.status;
                return (
                  <li key={request.id}>
                    <Link
                      to={`/requests/${request.id}`}
                      state={inbox ? { fromInbox: true } : undefined}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-3 sm:px-6"
                    >
                      <span className="font-medium">{kindLabel(request.kind, copy)}</span>
                      <Badge
                        variant={
                          status === "FAILED_APPLICATION"
                            ? "destructive"
                            : status === "SUBMITTED"
                              ? "default"
                              : "secondary"
                        }
                        className="w-fit max-w-full whitespace-normal text-left"
                      >
                        {queueStatusLabel(status, copy)}
                      </Badge>
                      <time
                        className="col-span-2 text-sm text-muted-foreground sm:col-span-1 sm:justify-self-end"
                        dateTime={
                          request.status === "SUBMITTED"
                            ? (request.submittedAt ?? request.updatedAt)
                            : request.updatedAt
                        }
                        title={formatDate(request.updatedAt, locale)}
                      >
                        {request.ageSeconds === undefined
                          ? formatDate(request.updatedAt, locale)
                          : formatAge(request.ageSeconds, locale, copy)}
                      </time>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {result.sourceUnavailable
                ? copy.sourceNoRows
                : filter
                  ? copy.queueEmptyFilter
                  : inbox
                    ? copy.inboxEmpty
                    : copy.empty}
            </p>
          )}
        </CardContent>
      </Card>
      {(page > 1 || result.hasMore) && (
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={() => onPage(page - 1)} disabled={page === 1}>
            {copy.previous}
          </Button>
          <Button variant="outline" onClick={() => onPage(page + 1)} disabled={!result.hasMore}>
            {copy.next}
          </Button>
        </div>
      )}
    </>
  );
}
