import React from "react";
import {
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
  onGenerateSessions: () => void;
  createSessionPending: boolean;
  generateSessionsPending: boolean;
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
}: SessionsPanelProps) {
  const sessions = sessionData?.items ?? [];
  const totalSessions = sessionData?.total ?? sessions.length;

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-sm font-semibold">Sessions</div>
        <div className="grid gap-4 md:grid-cols-[1fr_120px_160px_120px] items-end">
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
          <div className="flex flex-col gap-2">
            <Button
              variant="accent"
              className="w-full"
              onClick={onAddSession}
              disabled={createSessionPending}
            >
              Add session
            </Button>
            {hasRecurringSchedule ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={onGenerateSessions}
                disabled={generateSessionsPending}
              >
                <RotateCw className="h-4 w-4" />
                Generate current month
              </Button>
            ) : null}
          </div>
        </div>

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
