import React from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@corely/ui";
import { RotateCw } from "lucide-react";
import { formatDateTime } from "@/shared/lib/formatters";
import { CrudRowActions } from "@/shared/crud";

interface Session {
  id?: string;
  startsAt?: string;
  topic?: string | null;
  status?: string;
}

interface SessionData {
  items?: Session[];
  total?: number;
}

interface SessionsPanelProps {
  groupId: string;
  sessionData: SessionData | undefined;
  sessionsPage: number;
  onSessionsPageChange: (page: number) => void;
  sessionStart: string;
  sessionDuration: string;
  sessionTopic: string;
  hasRecurringSchedule: boolean;
  onSessionStartChange: (value: string) => void;
  onSessionDurationChange: (value: string) => void;
  onSessionTopicChange: (value: string) => void;
  onAddSession: () => void;
  onGenerateSessions: (month?: string) => void;
  createSessionPending: boolean;
  generateSessionsPending: boolean;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function SessionsPanel({
  sessionData,
  sessionsPage,
  onSessionsPageChange,
  sessionStart,
  sessionDuration,
  sessionTopic,
  hasRecurringSchedule,
  onSessionStartChange,
  onSessionDurationChange,
  onSessionTopicChange,
  onAddSession,
  onGenerateSessions,
  createSessionPending,
  generateSessionsPending,
  selectedMonth,
  onMonthChange,
}: SessionsPanelProps) {
  const sessions = sessionData?.items ?? [];
  const totalSessions = sessionData?.total ?? sessions.length;
  const currentMonthLabel = React.useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(new Date(year, month - 1));
  }, [selectedMonth]);

  const monthOptions = React.useMemo(() => {
    const now = new Date();
    const options = [];
    for (let i = -2; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
      options.push({ key, label });
    }
    return options;
  }, []);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Sessions</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Month:</span>
            <Select value={selectedMonth} onValueChange={onMonthChange}>
              <SelectTrigger className="h-8 w-[160px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.key} value={opt.key} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_120px_180px_auto] items-end">
          <div className="space-y-2">
            <Label>Start time</Label>
            <Input
              type="datetime-local"
              value={sessionStart}
              onChange={(e) => onSessionStartChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Duration (min)</Label>
            <Input
              type="number"
              min="15"
              step="15"
              value={sessionDuration}
              onChange={(e) => onSessionDurationChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Topic</Label>
            <Input value={sessionTopic} onChange={(e) => onSessionTopicChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="sr-only">Actions</Label>
            <Button
              variant="accent"
              className="w-full lg:min-w-[136px]"
              onClick={onAddSession}
              disabled={createSessionPending}
            >
              Add session
            </Button>
          </div>
        </div>
        {hasRecurringSchedule ? (
          <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-accent/40 bg-accent/10 text-accent uppercase tracking-wide text-[10px]"
                  >
                    Recurring schedule
                  </Badge>
                  <div className="text-sm font-medium">
                    Generate sessions for {currentMonthLabel}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  This adds only missing sessions based on your recurring schedule.
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="accent-outline"
                    className="w-full md:w-auto md:min-w-[240px]"
                    onClick={() => onGenerateSessions(selectedMonth)}
                    disabled={generateSessionsPending}
                  >
                    <RotateCw
                      className={generateSessionsPending ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                    />
                    {generateSessionsPending
                      ? "Generating..."
                      : `Generate for ${currentMonthLabel}`}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Safe to run multiple times. Existing sessions are not duplicated.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  Starts
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  Topic
                </th>
                <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.map((session, index) => (
                <tr
                  key={session.id ?? session.startsAt ?? `session-${index}`}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {session.startsAt ? formatDateTime(session.startsAt, "de-DE") : "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {session.topic || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {session.status ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <CrudRowActions
                      primaryAction={{
                        label: "Open",
                        href: session.id ? `/sessions/${session.id}` : undefined,
                      }}
                    />
                  </td>
                </tr>
              ))}
              {sessions.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-center text-muted-foreground" colSpan={4}>
                    No sessions scheduled yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {sessionData && totalSessions > 10 ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Showing {(sessionsPage - 1) * 10 + 1} to {Math.min(sessionsPage * 10, totalSessions)}{" "}
              of {totalSessions} sessions
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => onSessionsPageChange(Math.max(1, sessionsPage - 1))}
                    className={
                      sessionsPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      onSessionsPageChange(
                        Math.min(sessionsPage + 1, Math.ceil(totalSessions / 10))
                      )
                    }
                    className={
                      sessionsPage >= Math.ceil(totalSessions / 10)
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
