import React, { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PlusIcon, CopyIcon, Warehouse } from "lucide-react";
import { toast } from "sonner";
import type { FilterSpec, PageInfo, ResourceDto, ResourceType } from "@corely/contracts";

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
import { bookingResourceKeys } from "../queries";
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

type ResourcesResponse = {
  items: ResourceDto[];
  pageInfo?: PageInfo;
};

const RESOURCE_TYPE_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Staff", value: "STAFF" },
  { label: "Room", value: "ROOM" },
  { label: "Equipment", value: "EQUIPMENT" },
];

const RESOURCE_STATUS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const getFilterValue = (filters: FilterSpec[] | undefined, field: string) => {
  const match = filters?.find((filter) => filter.field === field);
  if (!match || match.value == null || match.value === "") {
    return undefined;
  }
  return String(match.value);
};

export const ResourcesPage = () => {
  const queryClient = useQueryClient();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ResourceDto | null>(null);

  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "updatedAt:desc" },
    { storageKey: "booking-resources-list-v1" }
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      { key: "type", label: "Type", type: "select", options: RESOURCE_TYPE_OPTIONS },
      { key: "status", label: "Status", type: "select", options: RESOURCE_STATUS_OPTIONS },
    ],
    []
  );

  const type = useMemo(
    () => getFilterValue(state.filters, "type") as ResourceType | undefined,
    [state.filters]
  );
  const status = useMemo(() => getFilterValue(state.filters, "status"), [state.filters]);

  const isActive = status === "active" ? true : status === "inactive" ? false : undefined;

  const queryParams = useMemo(
    () => ({
      q: state.q,
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
      type,
      isActive,
    }),
    [isActive, state.page, state.pageSize, state.q, state.sort, type]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: bookingResourceKeys.list({ ...queryParams, filters: state.filters }),
    queryFn: async () => {
      const qs = buildListQuery(queryParams).toString();
      const endpoint = qs ? `/booking/resources?${qs}` : "/booking/resources";
      return apiClient.get<ResourcesResponse>(endpoint, {
        correlationId: apiClient.generateCorrelationId(),
      });
    },
    placeholderData: keepPreviousData,
  });

  const resources = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: string) =>
      apiClient.delete(`/booking/resources/${resourceId}`, {
        correlationId: apiClient.generateCorrelationId(),
      }),
    onSuccess: async () => {
      toast.success("Resource deleted");
      await invalidateResourceQueries(queryClient, "booking/resources");
    },
    onError: () => toast.error("Failed to delete resource"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) =>
      Promise.all(
        ids.map((id) =>
          apiClient.delete(`/booking/resources/${id}`, {
            correlationId: apiClient.generateCorrelationId(),
          })
        )
      ),
    onSuccess: async () => {
      toast.success("Selected resources deleted");
      setSelectedIds(new Set());
      await invalidateResourceQueries(queryClient, "booking/resources");
    },
    onError: () => toast.error("Failed to delete selected resources"),
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
    resources.length > 0 && resources.every((resource) => selectedIds.has(resource.id));

  const primaryAction = (
    <Button asChild>
      <Link to="/booking/resources/new">
        <PlusIcon className="h-4 w-4 mr-2" />
        Add Resource
      </Link>
    </Button>
  );

  return (
    <>
      <CrudListPageLayout
        title="Booking Resources"
        subtitle="Manage physical assets, staff, and rooms available for booking."
        primaryAction={primaryAction}
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: "Updated (Newest)", value: "updatedAt:desc" },
              { label: "Updated (Oldest)", value: "updatedAt:asc" },
              { label: "Name (A-Z)", value: "name:asc" },
              { label: "Name (Z-A)", value: "name:desc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
            placeholder="Search resource name"
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || "Failed to load resources"}
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
                    key={`resource-skeleton-${index}`}
                    className="h-12 w-full animate-pulse rounded bg-muted/20"
                  />
                ))}
              </div>
            ) : resources.length === 0 ? (
              <EmptyState
                icon={Warehouse}
                title="No resources found"
                description="Create your first resource to make it available for bookings."
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
                          disabled={bulkDeleteMutation.isPending}
                        >
                          Delete selected
                        </Button>
                      }
                      title="Delete selected resources"
                      description="This action cannot be undone."
                      isLoading={bulkDeleteMutation.isPending}
                      onConfirm={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
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
                                setSelectedIds(new Set(resources.map((resource) => resource.id)));
                              } else {
                                setSelectedIds(new Set());
                              }
                            }}
                            aria-label="Select all resources"
                          />
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Name
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Type
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Capacity
                        </TableHead>
                        <TableHead className="w-[120px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resources.map((resource) => (
                        <TableRow
                          key={resource.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <TableCell className="px-4 py-3">
                            <Checkbox
                              checked={selectedIds.has(resource.id)}
                              onCheckedChange={() => toggleSelection(resource.id)}
                              aria-label={`Select resource ${resource.id}`}
                            />
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm font-medium">
                            {resource.name}
                            <div className="text-xs text-muted-foreground font-normal mt-1 flex items-center gap-1">
                              <span>{resource.id}</span>
                              <button
                                type="button"
                                onClick={() => navigator.clipboard.writeText(resource.id)}
                                className="inline-flex items-center text-muted-foreground hover:text-foreground"
                                aria-label="Copy resource id"
                              >
                                <CopyIcon className="h-3 w-3" />
                              </button>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant="secondary">{resource.type}</Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <Badge variant={resource.isActive ? "default" : "secondary"}>
                              {resource.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-sm">
                            {resource.capacity ?? "—"}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-right">
                            <CrudRowActions
                              primaryAction={{
                                label: "Open",
                                href: `/booking/resources/${resource.id}`,
                              }}
                              secondaryActions={[
                                { label: "Edit", href: `/booking/resources/${resource.id}/edit` },
                                {
                                  label: "Delete",
                                  destructive: true,
                                  onClick: () => setDeleteTarget(resource),
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
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
          trigger={null}
          title="Delete resource"
          description={`Delete "${deleteTarget?.name ?? ""}"? This action cannot be undone.`}
          confirmLabel="Delete resource"
          isLoading={deleteResourceMutation.isPending}
          onConfirm={async () => {
            if (!deleteTarget) {
              return;
            }
            await deleteResourceMutation.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
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
