import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@corely/ui";
import { Button } from "@corely/ui";
import { Alert, AlertDescription } from "@corely/ui";
import { Loader2, AlertCircle } from "lucide-react";
import { useTenants } from "../../hooks/useTenants";
import type { TenantDto } from "@corely/contracts";
import { useCanManageTenants } from "@/shared/lib/permissions";

export function TenantsListPage() {
  const { data: tenants = [], isLoading, error } = useTenants();
  const { can: canManageTenants } = useCanManageTenants();

  const sortedTenants = useMemo(
    () => [...tenants].sort((a, b) => a.name.localeCompare(b.name)),
    [tenants]
  );

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
          <h1 className="text-h1 text-foreground">Tenants</h1>
          <p className="text-sm text-muted-foreground">Manage tenant entitlements and settings.</p>
        </div>
        {canManageTenants ? (
          <Button asChild variant="accent">
            <Link to="/settings/tenants/new">Add tenant</Link>
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant list</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Tenant ID</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No tenants found.
                  </TableCell>
                </TableRow>
              ) : (
                sortedTenants.map((tenant: TenantDto) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {tenant.id}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/settings/tenants/${tenant.id}`}>Manage</Link>
                      </Button>
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
