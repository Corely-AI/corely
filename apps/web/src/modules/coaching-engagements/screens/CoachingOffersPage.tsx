import React, { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PlusIcon } from "lucide-react";
import { CrudListPageLayout } from "@/shared/crud";
import { ListToolbar, useListUrlState } from "@/shared/list-kit";
import { coachingApi } from "@/lib/coaching-api";
import { coachingOfferKeys } from "../queries";
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

const getLocalizedValue = (
  value: Record<string, string> | null | undefined,
  localeDefault: string
) => {
  if (!value) {
    return "—";
  }
  return value[localeDefault] ?? value.en ?? Object.values(value)[0] ?? "—";
};

export const CoachingOffersPage = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "updatedAt:desc" },
    { storageKey: "coaching-offers-list-v1" }
  );

  const queryParams = useMemo(
    () => ({
      q: state.q,
      page: state.page,
      pageSize: state.pageSize,
      includeArchived: false,
    }),
    [state.page, state.pageSize, state.q]
  );

  const { data, isLoading } = useQuery({
    queryKey: coachingOfferKeys.list(queryParams),
    queryFn: () => coachingApi.listOffers(queryParams),
    placeholderData: keepPreviousData,
  });

  return (
    <CrudListPageLayout
      title="Coaching offers"
      subtitle="Create and maintain reusable coaching offers with availability and booking rules."
      primaryAction={
        <Button asChild>
          <Link to="/coaching/offers/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            Add offer
          </Link>
        </Button>
      }
      toolbar={
        <ListToolbar
          search={state.q}
          onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
          sort={state.sort}
          onSortChange={(value) => setUrlState({ sort: value, page: 1 })}
          sortOptions={[
            { label: "Updated (Newest)", value: "updatedAt:desc" },
            { label: "Updated (Oldest)", value: "updatedAt:asc" },
          ]}
          onFilterClick={() => setIsFilterOpen((value) => !value)}
          placeholder="Search offer id"
        />
      }
    >
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offer</TableHead>
                <TableHead>Meeting</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Timezone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.items ?? []).map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="font-medium">
                      {getLocalizedValue(offer.title, offer.localeDefault)}
                    </div>
                    <div className="text-xs text-muted-foreground">{offer.id}</div>
                  </TableCell>
                  <TableCell>{offer.meetingType}</TableCell>
                  <TableCell>
                    {(offer.priceCents / 100).toFixed(2)} {offer.currency}
                  </TableCell>
                  <TableCell>{offer.sessionDurationMinutes}m</TableCell>
                  <TableCell>{offer.availabilityRule.timezone}</TableCell>
                  <TableCell>
                    <Badge variant={offer.archivedAt ? "secondary" : "outline"}>
                      {offer.archivedAt ? "Archived" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/coaching/offers/${offer.id}`}>Open</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.items?.length ?? 0) === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>No coaching offers yet.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
};
