import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@corely/ui";
import { toast } from "sonner";

import { catalogApi } from "@/lib/catalog-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog } from "@/shared/crud";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  useListUrlState,
  type FilterFieldDef,
} from "@/shared/list-kit";
import { formatDate } from "@/shared/lib/formatters";
import type { FilterSpec } from "@corely/contracts";
import { catalogItemKeys, catalogTaxProfileKeys, catalogUomKeys } from "../queries";

const getSelectFilterValue = (filters: FilterSpec[] | undefined, field: string) => {
  const match = filters?.find((filter) => filter.field === field);
  if (!match) {
    return undefined;
  }

  if (Array.isArray(match.value)) {
    return match.value.length > 0 ? String(match.value[0]) : undefined;
  }

  if (typeof match.value === "string" && match.value.trim().length > 0) {
    return match.value;
  }

  return undefined;
};

export default function CatalogItemsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "updatedAt:desc" },
    { storageKey: "catalog-items-list-v1" }
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

  const status = getSelectFilterValue(state.filters, "status");
  const type = getSelectFilterValue(state.filters, "type");
  const defaultUomId = getSelectFilterValue(state.filters, "defaultUomId");
  const taxProfileId = getSelectFilterValue(state.filters, "taxProfileId");

  const { data: uomsData } = useQuery({
    queryKey: catalogUomKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listUoms({ page: 1, pageSize: 200 }),
  });

  const { data: taxProfilesData } = useQuery({
    queryKey: catalogTaxProfileKeys.list({ page: 1, pageSize: 200 }),
    queryFn: () => catalogApi.listTaxProfiles({ page: 1, pageSize: 200 }),
  });

  const filterFields = useMemo<FilterFieldDef[]>(() => {
    const fields: FilterFieldDef[] = [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [
          { label: "Active", value: "ACTIVE" },
          { label: "Archived", value: "ARCHIVED" },
        ],
      },
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { label: "Product", value: "PRODUCT" },
          { label: "Service", value: "SERVICE" },
        ],
      },
    ];

    if ((uomsData?.items ?? []).length > 0) {
      fields.push({
        key: "defaultUomId",
        label: "UOM",
        type: "select",
        options: (uomsData?.items ?? []).map((uom) => ({
          label: `${uom.code} - ${uom.name}`,
          value: uom.id,
        })),
      });
    }

    if ((taxProfilesData?.items ?? []).length > 0) {
      fields.push({
        key: "taxProfileId",
        label: "Tax profile",
        type: "select",
        options: (taxProfilesData?.items ?? []).map((taxProfile) => ({
          label: taxProfile.name,
          value: taxProfile.id,
        })),
      });
    }

    return fields;
  }, [uomsData?.items, taxProfilesData?.items]);

  const { data, isLoading, isError } = useQuery({
    queryKey: catalogItemKeys.list({
      ...state,
      status,
      type,
      defaultUomId,
      taxProfileId,
    }),
    queryFn: () =>
      catalogApi.listItems({
        q: state.q,
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        filters: state.filters,
        status: status as "ACTIVE" | "ARCHIVED" | undefined,
        type: type as "PRODUCT" | "SERVICE" | undefined,
        defaultUomId,
        taxProfileId,
      }),
    placeholderData: keepPreviousData,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => catalogApi.archiveItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.list(undefined) });
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.all() });
      toast.success("Catalog item archived");
    },
    onError: () => {
      toast.error("Failed to archive catalog item");
    },
  });

  const pageInfo = data?.pageInfo;

  return (
    <>
      <CrudListPageLayout
        title="Catalog Items"
        subtitle="Manage products and services for purchasing, import, and sales"
        primaryAction={
          <Button variant="accent" onClick={() => navigate("/catalog/items/new")}>
            <Plus className="h-4 w-4" />
            New item
          </Button>
        }
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
              { label: "Code (A-Z)", value: "code:asc" },
              { label: "Code (Z-A)", value: "code:desc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          />
        }
        filters={
          (state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(filter) => {
                const nextFilters = state.filters?.filter((f) => f !== filter) ?? [];
                setUrlState({ filters: nextFilters, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <Card>
          <CardContent className="p-0">
            {isError ? (
              <div className="p-6 flex items-center justify-between gap-4">
                <div className="text-sm text-destructive">Catalog items could not be loaded.</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void queryClient.invalidateQueries({
                      queryKey: catalogItemKeys.all(),
                    })
                  }
                >
                  Retry
                </Button>
              </div>
            ) : null}

            {!isError && isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-12 w-full animate-pulse rounded bg-muted/20" />
                ))}
              </div>
            ) : null}

            {!isError && !isLoading && (data?.items.length ?? 0) === 0 ? (
              <EmptyState
                icon={Package}
                title="No catalog items found"
                description="Create your first item to make products available in operations."
                action={
                  <Button
                    variant="outline"
                    onClick={() => setUrlState({ q: "", filters: [], page: 1 })}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : null}

            {!isError && !isLoading && (data?.items.length ?? 0) > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                          Code
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                          Name
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                          Type
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                          Status
                        </th>
                        <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                          Updated
                        </th>
                        <th className="w-[50px]" />
                      </tr>
                    </thead>
                    <tbody>
                      {data?.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                          <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-sm">{item.type}</td>
                          <td className="px-4 py-3">
                            <Badge variant={item.status === "ACTIVE" ? "success" : "secondary"}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(item.updatedAt, "en-US")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CrudRowActions
                              primaryAction={{ label: "Open", href: `/catalog/items/${item.id}` }}
                              secondaryActions={[
                                { label: "Edit", href: `/catalog/items/${item.id}/edit` },
                                {
                                  label: "Archive",
                                  destructive: true,
                                  onClick: () => setArchiveTarget(item.id),
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageInfo ? (
                  <div className="border-t border-border px-4 py-3">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            href="#"
                            aria-disabled={state.page <= 1}
                            className={
                              state.page <= 1 ? "pointer-events-none opacity-50" : undefined
                            }
                            onClick={(event) => {
                              event.preventDefault();
                              if (state.page > 1) {
                                setUrlState({ page: state.page - 1 });
                              }
                            }}
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <span className="px-3 py-2 text-sm text-muted-foreground">
                            Page {pageInfo.page} of{" "}
                            {Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))}
                          </span>
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            href="#"
                            aria-disabled={!pageInfo.hasNextPage}
                            className={
                              !pageInfo.hasNextPage ? "pointer-events-none opacity-50" : undefined
                            }
                            onClick={(event) => {
                              event.preventDefault();
                              if (pageInfo.hasNextPage) {
                                setUrlState({ page: state.page + 1 });
                              }
                            }}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      </CrudListPageLayout>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        fields={filterFields}
        onApply={(filters) => setUrlState({ filters, page: 1 })}
      />

      <ConfirmDeleteDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        trigger={null}
        title="Archive item"
        description="This item will be archived and hidden from active catalog lists."
        isLoading={archiveMutation.isPending}
        onConfirm={() => {
          if (!archiveTarget) {
            return;
          }
          archiveMutation.mutate(archiveTarget);
          setArchiveTarget(null);
        }}
      />
    </>
  );
}
