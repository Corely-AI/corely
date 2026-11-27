import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, Mail, Phone, MapPin, Trash2 } from "lucide-react";
import { LoadingSkeleton, Card, CardContent } from "@corely/ui";
import { Button } from "@corely/ui";
import { customersApi } from "@/lib/customers-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog } from "@/shared/crud";
import { toast } from "sonner";
import { workspaceQueryKeys } from "@/shared/workspaces/workspace-query-keys";

export default function CustomersPage() {
  const uiCopy = useUiCopy("ui.customers-customerspage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const {
    data: customersData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: workspaceQueryKeys.customers.list(),
    queryFn: () => customersApi.listCustomers(),
  });

  const customers = customersData?.customers || [];

  const archiveCustomer = useMutation({
    mutationFn: (id: string) => customersApi.archiveCustomer(id),
    onSuccess: async () => {
      toast.success(uiCopy("customer-archived"));
      await queryClient.invalidateQueries({ queryKey: workspaceQueryKeys.customers.all() });
    },
    onError: () => toast.error(uiCopy("failed-to-archive-customer")),
  });

  const primaryAction = (
    <Button
      variant="accent"
      onClick={() => navigate("/customers/new")}
      data-testid="add-customer-button"
    >
      <Plus className="h-4 w-4" />
      {uiCopy("add-customer")}
    </Button>
  );

  return (
    <CrudListPageLayout
      title={uiCopy("customers")}
      subtitle="Manage contacts and billing details"
      primaryAction={primaryAction}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton variant="list" label={uiCopy("loading-customers")} />
          ) : isError ? (
            <div className="p-8 text-center text-destructive">
              {uiCopy("failed-to-load-customers")}
            </div>
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={uiCopy("no-customers-yet")}
              description={uiCopy("create-your-first-customer")}
              action={primaryAction}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("name")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("email")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("phone")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("city")}
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                            {customer.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {customer.displayName}
                            </div>
                            {customer.vatId && (
                              <div className="text-xs text-muted-foreground">{customer.vatId}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {customer.email ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{customer.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {customer.phone ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{customer.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {customer.billingAddress?.city ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{customer.billingAddress.city}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CrudRowActions
                          primaryAction={{
                            label: "Open",
                            href: `/customers/${customer.id}`,
                          }}
                          secondaryActions={[
                            {
                              label: "Edit",
                              href: `/customers/${customer.id}`,
                            },
                            {
                              label: "Archive",
                              destructive: true,
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => setDeleteTarget(customer.id),
                            },
                          ]}
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
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        trigger={null}
        title={uiCopy("archive-customer")}
        description={uiCopy("this-will-archive-the")}
        isLoading={archiveCustomer.isPending}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          archiveCustomer.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </CrudListPageLayout>
  );
}
