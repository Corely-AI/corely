import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Plus } from "lucide-react";
import { Button, Card, CardContent, Badge } from "@corely/ui";
import {
  CrudListPageLayout,
  CrudRowActions,
  ConfirmDeleteDialog,
  useCrudUrlState,
} from "@/shared/crud";
import { EmptyState } from "@/shared/components/EmptyState";
import { catalogApi } from "@/lib/catalog-api";
import { catalogItemKeys } from "../queries";

export default function CatalogItemsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useCrudUrlState({ pageSize: 20 });
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: catalogItemKeys.list(state),
    queryFn: () => catalogApi.listItems({ q: state.q, page: state.page, pageSize: state.pageSize }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => catalogApi.archiveItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.list(undefined) });
      await queryClient.invalidateQueries({ queryKey: catalogItemKeys.all() });
    },
  });

  const pageInfo = data?.pageInfo;

  return (
    <CrudListPageLayout
      title="Catalog Items"
      subtitle="Manage products, services, variants, and tax metadata"
      primaryAction={
        <Button variant="accent" onClick={() => navigate("/catalog/items/new")}>
          <Plus className="h-4 w-4" />
          New Item
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading catalog items...</div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive">Failed to load catalog items.</div>
          ) : !data || data.items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No catalog items yet"
              description="Create your first item to start building your catalog."
            />
          ) : (
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
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.type}</td>
                      <td className="px-4 py-3">
                        <Badge variant={item.status === "ACTIVE" ? "success" : "muted"}>
                          {item.status}
                        </Badge>
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
          )}
        </CardContent>
      </Card>
      {pageInfo ? (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pageInfo.page} of {Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState({ page: Math.max(1, state.page - 1) })}
              disabled={state.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pageInfo.hasNextPage && setState({ page: state.page + 1 })}
              disabled={!pageInfo.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
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
    </CrudListPageLayout>
  );
}
