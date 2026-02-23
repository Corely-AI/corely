import React, { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PlusIcon, CopyIcon, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import type { BookingDto, BookingStatus, FilterSpec, PageInfo } from "@corely/contracts";

import { apiClient } from "@/lib/api-client";
import { buildListQuery } from "@/lib/api-query-utils";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  CrudListPageLayout,
  CrudRowActions,
  ConfirmDeleteDialog,
  invalidateResourceQueries,
} from "@/shared/crud";
import {
  ListToolbar,
  ActiveFilterChips,
  useListUrlState,
  FilterPanel,
  type FilterFieldDef,
} from "@/shared/list-kit";
import { bookingKeys } from "../queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@corely/ui";

type BookingsResponse = {
  items: BookingDto[];
  pageInfo?: PageInfo;
};

const BOOKING_STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Draft", value: "DRAFT" },
  { label: "Hold", value: "HOLD" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "No-show", value: "NO_SHOW" },
  { label: "Completed", value: "COMPLETED" },
];

const getFilterValue = (filters: FilterSpec[] | undefined, field: string) => {
  const match = filters?.find((filter) => filter.field === field);
  if (!match || match.value == null || match.value === "") {
    return undefined;
  }
  return String(match.value);
};

export const BookingsPage = () => {
  const queryClient = useQueryClient();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [cancelTarget, setCancelTarget] = useState<BookingDto | null>(null);

  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "startAt:desc" },
    { storageKey: "booking-bookings-list-v1" }
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      { key: "status", label: "Status", type: "select", options: BOOKING_STATUS_OPTIONS },
      { key: "resourceId", label: "Resource ID", type: "text" },
      { key: "serviceOfferingId", label: "Service ID", type: "text" },
      { key: "bookedByPartyId", label: "Booked by party ID", type: "text" },
      { key: "fromDate", label: "From date", type: "date" },
      { key: "toDate", label: "To date", type: "date" },
    ],
    []
  );

  const status = useMemo(
    () => getFilterValue(state.filters, "status") as BookingStatus | undefined,
    [state.filters]
  );
  const resourceId = useMemo(() => getFilterValue(state.filters, "resourceId"), [state.filters]);
  const serviceOfferingId = useMemo(
    () => getFilterValue(state.filters, "serviceOfferingId"),
    [state.filters]
  );
  const bookedByPartyId = useMemo(
    () => getFilterValue(state.filters, "bookedByPartyId"),
    [state.filters]
  );
  const fromDate = useMemo(() => getFilterValue(state.filters, "fromDate"), [state.filters]);
  const toDate = useMemo(() => getFilterValue(state.filters, "toDate"), [state.filters]);

  const queryParams = useMemo(
    () => ({
      q: state.q,
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
      status,
      resourceId,
      serviceOfferingId,
      bookedByPartyId,
      fromDate,
      toDate,
    }),
    [
      bookedByPartyId,
      fromDate,
      resourceId,
      serviceOfferingId,
      state.page,
      state.pageSize,
      state.q,
      state.sort,
      status,
      toDate,
    ]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: bookingKeys.list({ ...queryParams, filters: state.filters }),
    queryFn: async () => {
      const qs = buildListQuery(queryParams).toString();
      const endpoint = qs ? `/booking/bookings?${qs}` : "/booking/bookings";
      return apiClient.get<BookingsResponse>(endpoint, {
        correlationId: apiClient.generateCorrelationId(),
      });
    },
    placeholderData: keepPreviousData,
  });

  const bookings = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  const cancelBookingMutation = useMutation({
    mutationFn: async (bookingId: string) =>
      apiClient.post(
        `/booking/bookings/${bookingId}/cancel`,
        { reason: "Cancelled from bookings list" },
        {
          idempotencyKey: apiClient.generateIdempotencyKey(),
          correlationId: apiClient.generateCorrelationId(),
        }
      ),
    onSuccess: async () => {
      toast.success("Booking cancelled");
      await invalidateResourceQueries(queryClient, "booking/bookings");
    },
    onError: () => toast.error("Failed to cancel booking"),
  });

  const bulkCancelMutation = useMutation({
    mutationFn: async (ids: string[]) =>
      Promise.all(
        ids.map((id) =>
          apiClient.post(
            `/booking/bookings/${id}/cancel`,
            { reason: "Cancelled from bookings list (bulk)" },
            {
              idempotencyKey: apiClient.generateIdempotencyKey(),
              correlationId: apiClient.generateCorrelationId(),
            }
          )
        )
      ),
    onSuccess: async () => {
      toast.success("Selected bookings cancelled");
      setSelectedIds(new Set());
      await invalidateResourceQueries(queryClient, "booking/bookings");
    },
    onError: () => toast.error("Failed to cancel selected bookings"),
  });

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const allSelected =
    bookings.length > 0 && bookings.every((booking) => selectedIds.has(booking.id));

  const primaryAction = (
    <Button asChild>
      <Link to="/booking/bookings/new">
        <PlusIcon className="h-4 w-4 mr-2" />
        New Booking
      </Link>
    </Button>
  );

  return (
    <>
      <CrudListPageLayout
        title="Bookings"
        subtitle="View and manage customer and internal bookings."
        primaryAction={primaryAction}
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: "Start time (Newest)", value: "startAt:desc" },
              { label: "Start time (Oldest)", value: "startAt:asc" },
              { label: "Updated (Newest)", value: "updatedAt:desc" },
              { label: "Updated (Oldest)", value: "updatedAt:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
            placeholder="Search booking, customer, or reference"
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || "Failed to load bookings"}
              </div>
            ) : null}
          </ListToolbar>
        }
        filters={
          (state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(filter) => {
                const nextFilters = state.filters?.filter((item) => item !== filter) ?? [];
                setUrlState({ filters: nextFilters, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`booking-skeleton-${index}`}
                    className="h-12 w-full animate-pulse rounded bg-muted/20"
                  />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <EmptyState
                icon={CalendarIcon}
                title="No bookings found"
                description="Create your first booking to start managing your calendar."
                action={
                  <Button
                    variant="outline"
                    onClick={() => setUrlState({ q: "", filters: [], page: 1 })}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <>
                {selectedIds.size > 0 ? (
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
                    <div className="text-sm text-muted-foreground">{selectedIds.size} selected</div>
                    <ConfirmDeleteDialog
                      trigger={
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={bulkCancelMutation.isPending}
                        >
                          Cancel selected
                        </Button>
                      }
                      title="Cancel selected bookings"
                      description="This action will cancel all selected bookings."
                      isLoading={bulkCancelMutation.isPending}
                      onConfirm={() => bulkCancelMutation.mutate(Array.from(selectedIds))}
                    />
                  </div>
                ) : null}

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/50">
                        <TableHead className="w-12 px-4 py-3">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedIds(new Set(bookings.map((booking) => booking.id)));
                              } else {
                                setSelectedIds(new Set());
                              }
                            }}
                            aria-label="Select all bookings"
                          />
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Reference
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Customer
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Date & Time
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="w-[120px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow
                          key={booking.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="px-4 py-3">
                            <Checkbox
                              checked={selectedIds.has(booking.id)}
                              onCheckedChange={() => toggleSelection(booking.id)}
                              aria-label={`Select booking ${booking.id}`}
                            />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm font-medium">
                            {booking.referenceNumber || "-"}
                            <div className="text-xs text-muted-foreground font-normal mt-1 flex items-center gap-1">
                              <span>{booking.id}</span>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(booking.id)}
                                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                                aria-label="Copy booking id"
                              >
                                <CopyIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm">
                            {booking.bookedByName || booking.bookedByEmail || "Internal"}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="text-sm">
                              {new Date(booking.startAt).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              to{" "}
                              {new Date(booking.endAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge
                              variant={
                                booking.status === "CONFIRMED"
                                  ? "default"
                                  : booking.status === "CANCELLED"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <CrudRowActions
                              primaryAction={{
                                label: "Open",
                                href: `/booking/bookings/${booking.id}`,
                              }}
                              secondaryActions={[
                                {
                                  label: "Edit",
                                  href: `/booking/bookings/${booking.id}/edit`,
                                },
                                {
                                  label: "Cancel",
                                  destructive: true,
                                  disabled: booking.status === "CANCELLED",
                                  tooltip:
                                    booking.status === "CANCELLED"
                                      ? "Booking is already cancelled"
                                      : undefined,
                                  onClick: () => setCancelTarget(booking),
                                },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {pageInfo ? (
                  <Pagination className="border-t border-border p-4">
                    <PaginationContent>
                      <PaginationItem>
                        <span className="text-sm text-muted-foreground mr-4">
                          Page {pageInfo.page} of{" "}
                          {Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => state.page > 1 && setUrlState({ page: state.page - 1 })}
                          className={
                            state.page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            pageInfo.hasNextPage && setUrlState({ page: state.page + 1 })
                          }
                          className={
                            !pageInfo.hasNextPage
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <ConfirmDeleteDialog
          open={cancelTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setCancelTarget(null);
            }
          }}
          trigger={null}
          title="Cancel booking"
          description={`Cancel booking ${cancelTarget?.referenceNumber ?? cancelTarget?.id ?? ""}?`}
          confirmLabel="Cancel booking"
          isLoading={cancelBookingMutation.isPending}
          onConfirm={async () => {
            if (!cancelTarget) {
              return;
            }
            await cancelBookingMutation.mutateAsync(cancelTarget.id);
            setCancelTarget(null);
          }}
        />
      </CrudListPageLayout>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        onApply={(filters) => setUrlState({ filters, page: 1 })}
        fields={filterFields}
      />
    </>
  );
};
