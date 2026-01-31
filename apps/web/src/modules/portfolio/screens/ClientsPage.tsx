import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Search, Star, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog, useCrudUrlState } from "@/shared/crud";
import { formatDate } from "@/shared/lib/formatters";
import { portfolioApi } from "@/lib/portfolio-api";
import { portfolioKeys } from "../queries";
import { toast } from "sonner";
import type { PortfolioClientType } from "@corely/contracts";

const typeOptions: { label: string; value: "" | PortfolioClientType }[] = [
  { label: "All types", value: "" },
  { label: "CTO", value: "cto" },
  { label: "Freelancer", value: "freelancer" },
  { label: "Partner", value: "partner" },
  { label: "Employer", value: "employer" },
  { label: "Other", value: "other" },
];

export default function ClientsPage() {
  const { showcaseId } = useParams<{ showcaseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filters = useMemo(() => listState.filters ?? {}, [listState.filters]);
  const typeFilter = typeof filters.clientType === "string" ? (filters.clientType as PortfolioClientType) : "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: portfolioKeys.clients.list(showcaseId ?? "", {
      q: listState.q,
      page: listState.page,
      pageSize: listState.pageSize,
      sort: listState.sort,
      clientType: typeFilter || undefined,
    }),
    queryFn: () => {
      if (!showcaseId) {
        return Promise.resolve({ items: [], pageInfo: { page: 1, pageSize: 10, total: 0, hasNextPage: false } });
      }
      return portfolioApi.listClients(showcaseId, {
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
        sort: listState.sort,
        clientType: typeFilter || undefined,
      });
    },
    enabled: Boolean(showcaseId),
  });

  const clients = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => portfolioApi.deleteClient(id),
    onSuccess: async () => {
      toast.success("Client deleted");
      if (showcaseId) {
        await queryClient.invalidateQueries({ queryKey: ["portfolio", "clients", "list", showcaseId] });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete client");
    },
  });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients"
          className="pl-8 w-64"
          defaultValue={listState.q ?? ""}
          onChange={(event) => setListState({ q: event.target.value, page: 1 })}
        />
      </div>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={typeFilter}
        onChange={(event) =>
          setListState({
            filters: {
              ...filters,
              clientType: event.target.value || undefined,
            },
            page: 1,
          })
        }
      >
        {typeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || "Failed to load clients"}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <Button
      variant="accent"
      onClick={() => navigate(`/portfolio/showcases/${showcaseId}/clients/new`)}
      disabled={!showcaseId}
    >
      <Plus className="h-4 w-4" />
      New client
    </Button>
  );

  return (
    <CrudListPageLayout
      title="Clients"
      subtitle="Logos, testimonials, and client relationships"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading clients...</div>
          ) : clients.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No clients yet"
              description="Add clients to connect them with your projects."
              action={primaryAction}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Name
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Type
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Location
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Featured
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Updated
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((client) => (
                      <tr
                        key={client.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{client.name}</div>
                          <div className="text-xs text-muted-foreground">{client.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">{client.clientType}</td>
                        <td className="px-4 py-3 text-sm">{client.locationText}</td>
                        <td className="px-4 py-3 text-sm">
                          {client.featured ? (
                            <Badge variant="success" className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Featured
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(client.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{
                              label: "Edit",
                              href: `/portfolio/clients/${client.id}/edit`,
                            }}
                            secondaryActions={[
                              {
                                label: "Delete",
                                destructive: true,
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: () => setDeleteTarget(client.id),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.pageInfo ? (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
                  <div>
                    Page {data.pageInfo.page} · {data.pageInfo.total} total
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={listState.page <= 1}
                      onClick={() => setListState({ page: Math.max(1, listState.page - 1) })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pageInfo.hasNextPage}
                      onClick={() => setListState({ page: listState.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
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
        title="Delete client"
        description="This will permanently delete the client."
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </CrudListPageLayout>
  );
}
