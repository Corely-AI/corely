import React, { useMemo } from "react";
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

export function TenantsListPage() {
  const { t } = useTranslation();
  const { data: tenants = [], isLoading, error } = useTenants();
  const { mutate: updateTenant, isPending: isUpdating } = useUpdateTenant();
  const { can: canManageTenants } = useCanManageTenants();

  const sortedTenants = useMemo(
    () => [...tenants].sort((a, b) => a.name.localeCompare(b.name)),
    [tenants]
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
        <CardContent>
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
              {sortedTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("tenants.noTenants")}
                  </TableCell>
                </TableRow>
              ) : (
                sortedTenants.map((tenant: TenantDto) => (
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
        </CardContent>
      </Card>
    </div>
  );
}
