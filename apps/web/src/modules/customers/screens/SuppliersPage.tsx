import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Mail, MapPin, Phone, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button, Card, CardContent, Input } from "@corely/ui";
import { toast } from "sonner";
import { customersApi } from "@/lib/customers-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog } from "@/shared/crud";
import { hasPermission, useEffectivePermissions } from "@/shared/lib/permissions";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { withWorkspace } from "@/shared/workspaces/workspace-query-keys";

type SupplierFilter = "ACTIVE" | "ARCHIVED";

export default function SuppliersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SupplierFilter>("ACTIVE");

  const { hasCapability } = useWorkspaceConfig();
  const { data: effectivePermissions } = useEffectivePermissions();
  const rbacEnabled = hasCapability("workspace.rbac");
  const canManageSuppliers =
    !rbacEnabled || hasPermission(effectivePermissions?.permissions, "party.customers.manage");

  const suppliersQuery = useQuery({
    queryKey: withWorkspace(["suppliers", "list", { search, status }]),
    queryFn: async () => {
      const trimmedSearch = search.trim();
      if (trimmedSearch.length > 0) {
        return customersApi.searchCustomers({ q: trimmedSearch, role: "SUPPLIER", pageSize: 200 });
      }
      return customersApi.listCustomers({
        role: "SUPPLIER",
        includeArchived: status === "ARCHIVED",
        pageSize: 200,
      });
    },
  });

  const suppliers = useMemo(() => {
    const all = suppliersQuery.data?.customers ?? [];
    if (status === "ARCHIVED") {
      return all.filter((supplier) => supplier.archivedAt);
    }
    return all.filter((supplier) => !supplier.archivedAt);
  }, [status, suppliersQuery.data?.customers]);

  const archiveMutation = useMutation({
    mutationFn: (id: string) => customersApi.archiveCustomer(id, "SUPPLIER"),
    onSuccess: async () => {
      toast.success("Supplier archived");
      await queryClient.invalidateQueries({ queryKey: withWorkspace(["suppliers"]) });
    },
    onError: () => toast.error("Failed to archive supplier"),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: string) => customersApi.unarchiveCustomer(id, "SUPPLIER"),
    onSuccess: async () => {
      toast.success("Supplier restored");
      await queryClient.invalidateQueries({ queryKey: withWorkspace(["suppliers"]) });
    },
    onError: () => toast.error("Failed to restore supplier"),
  });

  const primaryAction = canManageSuppliers ? (
    <Button variant="accent" onClick={() => navigate("/suppliers/new")}>
      <Plus className="h-4 w-4" />
      Create supplier
    </Button>
  ) : null;

  return (
    <CrudListPageLayout
      title="Suppliers"
      subtitle="Manage supplier records used in purchasing and import shipments"
      primaryAction={primaryAction}
      toolbar={
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by supplier name"
            className="md:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value as SupplierFilter)}
            >
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <Button variant="outline" onClick={() => void suppliersQuery.refetch()}>
              Refresh
            </Button>
          </div>
        </div>
      }
    >
      <Card>
        <CardContent className="p-0">
          {suppliersQuery.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading suppliers...</div>
          ) : suppliersQuery.isError ? (
            <div className="p-8 text-center text-destructive">Failed to load suppliers.</div>
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={status === "ARCHIVED" ? "No archived suppliers" : "No suppliers yet"}
              description={
                status === "ARCHIVED"
                  ? "Archived suppliers will appear here."
                  : "Create your first supplier so it can be selected in import shipments."
              }
              action={primaryAction}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Supplier
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Country
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr
                      key={supplier.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{supplier.displayName}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {supplier.email ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{supplier.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {supplier.phone ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{supplier.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {supplier.billingAddress?.country ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{supplier.billingAddress.country}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CrudRowActions
                          primaryAction={{ label: "Open", href: `/suppliers/${supplier.id}` }}
                          secondaryActions={
                            status === "ARCHIVED"
                              ? [
                                  {
                                    label: "Restore",
                                    icon: <RotateCcw className="h-4 w-4" />,
                                    onClick: () => unarchiveMutation.mutate(supplier.id),
                                  },
                                ]
                              : [
                                  {
                                    label: "Edit",
                                    href: `/suppliers/${supplier.id}`,
                                  },
                                  {
                                    label: "Archive",
                                    destructive: true,
                                    icon: <Trash2 className="h-4 w-4" />,
                                    onClick: () => setDeleteTarget(supplier.id),
                                  },
                                ]
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        trigger={null}
        title="Archive supplier"
        description="Archived suppliers are hidden from shipment pickers until restored."
        isLoading={archiveMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          archiveMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </CrudListPageLayout>
  );
}
