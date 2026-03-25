import React, { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@corely/ui";
import { CrudListPageLayout } from "@/shared/crud";
import { ListToolbar, useListUrlState } from "@/shared/list-kit";
import { coachingApi } from "@/lib/coaching-api";
import { coachingSessionKeys } from "../queries";

export const CoachingSessionsPage = () => {
  const { t } = useTranslation();
  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "startAt:desc" },
    { storageKey: "coaching-sessions-list-v1" }
  );

  const queryParams = useMemo(
    () => ({
      q: state.q,
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
    }),
    [state.page, state.pageSize, state.q, state.sort]
  );

  const { data, isLoading } = useQuery({
    queryKey: coachingSessionKeys.list(queryParams),
    queryFn: () => coachingApi.listSessions(queryParams),
    placeholderData: keepPreviousData,
  });

  return (
    <CrudListPageLayout
      title={t("coaching.sessions.title")}
      subtitle={t("coaching.sessions.subtitle")}
      toolbar={
        <ListToolbar
          search={state.q}
          onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
          sort={state.sort}
          onSortChange={(value) => setUrlState({ sort: value, page: 1 })}
          sortOptions={[
            { label: "Upcoming", value: "startAt:asc" },
            { label: "Latest", value: "startAt:desc" },
          ]}
          onFilterClick={() => undefined}
        />
      }
    >
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("coaching.sessions.columns.engagement")}</TableHead>
                <TableHead>{t("coaching.sessions.columns.start")}</TableHead>
                <TableHead>{t("coaching.sessions.columns.status")}</TableHead>
                <TableHead>{t("coaching.sessions.columns.meeting")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.engagementId}</TableCell>
                  <TableCell>{new Date(session.startAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge>{session.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {session.meetingLink ?? t("coaching.sessions.pendingMeeting")}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.items?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>{t("coaching.empty.sessions")}</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
};
