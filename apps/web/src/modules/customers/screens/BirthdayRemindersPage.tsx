import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardContent, Input, Label } from "@corely/ui";
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
      title="Birthday Reminders"
      subtitle="See upcoming customer birthdays for the next period"
      primaryAction={
        <Button
          variant="outline"
          onClick={() => birthdaysQuery.refetch()}
          disabled={birthdaysQuery.isFetching}
        >
          Refresh
        </Button>
      }
      filters={
        <>
          <div className="space-y-1">
            <Label htmlFor="birthdays-from">From</Label>
            <Input
              id="birthdays-from"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-[180px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="birthdays-to">To</Label>
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
            <div className="p-8 text-center text-destructive">
              End date must be greater than or equal to start date.
            </div>
          ) : birthdaysQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading upcoming birthdays...
            </div>
          ) : birthdaysQuery.isError ? (
            <div className="p-8 text-center text-destructive">
              Failed to load birthday reminders.
            </div>
          ) : birthdays.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No upcoming birthdays in this range.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Birthday
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Next birthday
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      In
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      Action
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
                        {item.daysUntilBirthday} day{item.daysUntilBirthday === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/customers/${item.customerPartyId}`}>Open</Link>
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
