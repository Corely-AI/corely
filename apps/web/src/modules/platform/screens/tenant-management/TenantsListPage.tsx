import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@corely/ui";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Alert, AlertDescription } from "@corely/ui";
import { Loader2, AlertCircle, Power, PowerOff } from "lucide-react";
import { useTenants } from "../../hooks/useTenants";
import { useUpdateTenant } from "../../hooks/useUpdateTenant";
import type { TenantDto } from "@corely/contracts";
import { useCanManageTenants } from "@/shared/lib/permissions";
import { useTranslation } from "react-i18next";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  useListUrlState,
  type FilterFieldDef,
} from "@/shared/list-kit";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@corely/ui";

export function TenantsListPage() {
  const { t } = useTranslation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "createdAt:desc" },
    { storageKey: "tenants-list-v1" }
  );
  const statusFilter = useMemo<TenantDto["status"] | undefined>(() => {
    const filter = state.filters?.find((item) => item.field === "status" && item.operator === "eq");
    const value = String(filter?.value ?? "");
    return value === "ACTIVE" || value === "SUSPENDED" || value === "ARCHIVED" ? value : undefined;
  }, [state.filters]);
  const { data, isLoading, error } = useTenants({
    q: state.q,
    page: state.page,
    pageSize: state.pageSize,
    sort: state.sort,
    status: statusFilter,
  });
  const tenants = data?.tenants ?? [];
  const pageInfo = data?.pageInfo;
  const { mutate: updateTenant, isPending: isUpdating } = useUpdateTenant();
  const { can: canManageTenants } = useCanManageTenants();

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "status",
        label: t("tenants.status"),
        type: "select",
        options: [
          { label: t("common.active"), value: "ACTIVE" },
          { label: t("common.suspended"), value: "SUSPENDED" },
          { label: "Archived", value: "ARCHIVED" },
        ],
      },
    ],
    [t]
  );

  const toggleStatus = (tenant: TenantDto) => {
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    const confirmMessage =
      nextStatus === "SUSPENDED" ? t("tenants.confirmDeactivate") : t("tenants.confirmActivate");

    if (window.confirm(confirmMessage)) {
      updateTenant({
        tenantId: tenant.id,
        input: { status: nextStatus },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load tenants. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{t("tenants.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("tenants.description")}</p>
        </div>
        {canManageTenants ? (
          <Button asChild variant="accent">
            <Link to="/settings/tenants/new">{t("tenants.addTenant")}</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("tenants.listTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value, page: 1 })}
            sortOptions={[
              { label: `${t("common.name")} (A-Z)`, value: "name:asc" },
              { label: `${t("common.name")} (Z-A)`, value: "name:desc" },
              { label: `${t("tenants.slug")} (A-Z)`, value: "slug:asc" },
              { label: `${t("tenants.slug")} (Z-A)`, value: "slug:desc" },
              { label: "Created (Newest)", value: "createdAt:desc" },
              { label: "Created (Oldest)", value: "createdAt:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          />
          {(state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(filter) => {
                const next = state.filters?.filter((entry) => entry !== filter) ?? [];
                setUrlState({ filters: next, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("tenants.slug")}</TableHead>
                <TableHead>{t("tenants.status")}</TableHead>
                <TableHead>{t("tenants.tenantId")}</TableHead>
                <TableHead className="text-right">{t("tenants.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("tenants.noTenants")}
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant: TenantDto) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === "ACTIVE" ? "success" : "secondary"}>
                        {tenant.status === "ACTIVE" ? t("common.active") : t("common.suspended")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {tenant.id}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canManageTenants ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => toggleStatus(tenant)}
                            title={
                              tenant.status === "ACTIVE"
                                ? t("common.deactivate")
                                : t("common.activate")
                            }
                          >
                            {tenant.status === "ACTIVE" ? (
                              <PowerOff className="h-4 w-4 text-destructive" />
                            ) : (
                              <Power className="h-4 w-4 text-success" />
                            )}
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/settings/tenants/${tenant.id}`}>{t("tenants.manage")}</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {pageInfo ? (
            <Pagination>
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
                    onClick={() => pageInfo.hasNextPage && setUrlState({ page: state.page + 1 })}
                    className={
                      !pageInfo.hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          ) : null}
        </CardContent>
      </Card>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        onApply={(filters) => setUrlState({ filters, page: 1 })}
        fields={filterFields}
      />
    </div>
  );
}
