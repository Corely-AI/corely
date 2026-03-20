import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
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
import { coachingKeys } from "../queries";

export const CoachingEngagementsPage = () => {
  const { t } = useTranslation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "createdAt:desc" },
    { storageKey: "coaching-engagements-list-v1" }
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
    queryKey: coachingKeys.list(queryParams),
    queryFn: () => coachingApi.listEngagements(queryParams),
    placeholderData: keepPreviousData,
  });

  return (
    <CrudListPageLayout
      title={t("coaching.engagements.title")}
      subtitle={t("coaching.engagements.subtitle")}
      toolbar={
        <ListToolbar
          search={state.q}
          onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
          sort={state.sort}
          onSortChange={(value) => setUrlState({ sort: value, page: 1 })}
          sortOptions={[
            { label: "Newest", value: "createdAt:desc" },
            { label: "Oldest", value: "createdAt:asc" },
          ]}
          onFilterClick={() => setIsFilterOpen((value) => !value)}
        />
      }
    >
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("coaching.engagements.columns.offer")}</TableHead>
                <TableHead>{t("coaching.engagements.columns.client")}</TableHead>
                <TableHead>{t("coaching.engagements.columns.status")}</TableHead>
                <TableHead>{t("coaching.engagements.columns.billing")}</TableHead>
                <TableHead>{t("coaching.engagements.columns.updated")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((engagement) => (
                <TableRow key={engagement.id}>
                  <TableCell>
                    {engagement.offer.title[engagement.locale] ??
                      engagement.offer.title.en ??
                      engagement.offer.id}
                  </TableCell>
                  <TableCell>{engagement.clientPartyId}</TableCell>
                  <TableCell>
                    <Badge>{engagement.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary">{engagement.paymentStatus}</Badge>
                      <Badge variant="outline">{engagement.contractStatus}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(engagement.updatedAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/coaching/engagements/${engagement.id}`}>{t("common.open")}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.items?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>{t("coaching.empty.engagements")}</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
};
