import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LoadingSkeleton, Button, Card, CardContent, Input, Label } from "@corely/ui";
import { engagementApi } from "@/lib/engagement-api";
import { CrudListPageLayout } from "@/shared/crud";
import { workspaceQueryKeys } from "@/shared/workspaces/workspace-query-keys";

const toDateInputValue = (value: Date): string => value.toISOString().slice(0, 10);

const addDays = (value: Date, days: number): Date => {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const formatLocalDate = (value: string): string => {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleDateString();
};

export default function BirthdayRemindersPage() {
  const uiCopy = useUiCopy("ui.customers-birthdayreminderspage");
  const today = React.useMemo(() => toDateInputValue(new Date()), []);
  const inThirtyDays = React.useMemo(() => toDateInputValue(addDays(new Date(), 30)), []);

  const [fromDate, setFromDate] = React.useState(today);
  const [toDate, setToDate] = React.useState(inThirtyDays);

  const hasInvalidRange = Boolean(fromDate && toDate && toDate < fromDate);

  const birthdaysQuery = useQuery({
    queryKey: workspaceQueryKeys.engagementBirthdays.list({ fromDate, toDate, pageSize: 200 }),
    queryFn: () =>
      engagementApi.listUpcomingBirthdays({
        from: fromDate || undefined,
        to: toDate || undefined,
        pageSize: 200,
      }),
    enabled: !hasInvalidRange,
  });

  const birthdays = birthdaysQuery.data?.items ?? [];

  return (
    <CrudListPageLayout
      title={uiCopy("birthday-reminders")}
      subtitle="See upcoming customer birthdays for the next period"
      primaryAction={
        <Button
          variant="outline"
          onClick={() => birthdaysQuery.refetch()}
          disabled={birthdaysQuery.isFetching}
        >
          {uiCopy("refresh")}
        </Button>
      }
      filters={
        <>
          <div className="space-y-1">
            <Label htmlFor="birthdays-from">{uiCopy("from")}</Label>
            <Input
              id="birthdays-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-[180px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="birthdays-to">{uiCopy("to")}</Label>
            <Input
              id="birthdays-to"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-[180px]"
            />
          </div>
        </>
      }
    >
      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          {hasInvalidRange ? (
            <div className="p-8 text-center text-destructive">{uiCopy("end-date-must-be")}</div>
          ) : birthdaysQuery.isLoading ? (
            <LoadingSkeleton variant="list" label={uiCopy("loading-upcoming-birthdays")} />
          ) : birthdaysQuery.isError ? (
            <div className="p-8 text-center text-destructive">
              {uiCopy("failed-to-load-birthday")}
            </div>
          ) : birthdays.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {uiCopy("no-upcoming-birthdays-in")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {uiCopy("customer")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {uiCopy("birthday")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {uiCopy("next-birthday")}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      {uiCopy("in")}
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      {uiCopy("action")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {birthdays.map((item) => (
                    <tr key={item.customerPartyId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground">{item.displayName}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatLocalDate(item.birthday)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatLocalDate(item.nextBirthday)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {item.daysUntilBirthday}
                        {" " + uiCopy("day")}
                        {item.daysUntilBirthday === 1 ? "" : uiCopy("s")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/customers/${item.customerPartyId}`}>{uiCopy("open")}</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
}
