import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { formatDate } from "@/shared/lib/formatters";
import { formsApi } from "@/lib/forms-api";
import { formKeys } from "../queries";
import type { FormStatus } from "@corely/contracts";

const STATUS_OPTIONS = [
  { label: "Draft", value: "DRAFT" },
  { label: "Published", value: "PUBLISHED" },
];

export default function FormsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [state, setUrlState] = useListUrlState(
    { pageSize: 10, sort: "updatedAt:desc" },
    { storageKey: "forms-list-v1" }
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: STATUS_OPTIONS,
      },
    ],
    []
  );

  const statusFilter = useMemo<FormStatus | undefined>(() => {
    const status = state.filters?.find((f) => f.field === "status" && f.operator === "eq");
    if (!status) {
      return undefined;
    }
    const value = String(status.value);
    return value === "DRAFT" || value === "PUBLISHED" ? value : undefined;
  }, [state.filters]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: formKeys.list({ ...state, status: statusFilter }),
    queryFn: () =>
      formsApi.listForms({
        q: state.q,
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        status: statusFilter,
        filters: state.filters,
      }),
    placeholderData: keepPreviousData,
  });

  const forms = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  const deleteMutation = useMutation({
    mutationFn: (formId: string) => formsApi.deleteForm(formId),
    onSuccess: async () => {
      toast.success("Form deleted");
      await invalidateResourceQueries(queryClient, "forms");
    },
    onError: () => toast.error("Failed to delete form"),
  });

  return (
    <>
      <CrudListPageLayout
        title="Forms"
        subtitle="Create and manage public forms"
        primaryAction={
          <Button variant="accent" onClick={() => navigate("/forms/new")}>
            <Plus className="h-4 w-4" />
            New form
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
              { label: "Created (Newest)", value: "createdAt:desc" },
              { label: "Name (A-Z)", value: "name:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || "Failed to load forms"}
              </div>
            ) : null}
          </ListToolbar>
        }
        filters={
          (state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(filter) => {
                const next = state.filters?.filter((f) => f !== filter) ?? [];
                setUrlState({ filters: next, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <Card>
          <CardContent className="p-0" data-testid="forms-list">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded bg-muted/20" />
                ))}
              </div>
            ) : forms.length === 0 ? (
              <EmptyState
                icon={ExternalLink}
                title="No forms yet"
                description="Create your first form to collect responses."
                action={
                  <Button variant="outline" onClick={() => navigate("/forms/new")}>
                    Create form
                  </Button>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Updated
                        </th>
                        <th className="w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {forms.map((form) => (
                        <tr
                          key={form.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium">{form.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant={form.status === "PUBLISHED" ? "success" : "muted"}>
                              {form.status === "PUBLISHED" ? "Published" : "Draft"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(form.updatedAt, "en-US")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CrudRowActions
                              primaryAction={{ label: "Open", href: `/forms/${form.id}` }}
                              secondaryActions={[
                                {
                                  label: "Delete",
                                  destructive: true,
                                  onClick: () => setDeleteTarget(form.id),
                                  icon: <Trash2 className="h-4 w-4" />,
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageInfo && (
                  <Pagination className="border-t border-border p-4">
                    <PaginationContent>
                      <PaginationItem>
                        <span className="text-sm text-muted-foreground mr-4">
                          Page {pageInfo.page} of {Math.ceil(pageInfo.total / pageInfo.pageSize)}
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
                )}
              </>
            )}
          </CardContent>
        </Card>

        <ConfirmDeleteDialog
          open={deleteTarget !== null}
          onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
          trigger={null}
          title="Delete form"
          description="This will archive the form and remove it from the list."
          isLoading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteTarget) {
              deleteMutation.mutate(deleteTarget);
            }
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
}
