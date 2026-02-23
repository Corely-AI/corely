import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Store } from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@corely/ui";
import {
  ConfirmDeleteDialog,
  CrudListPageLayout,
  CrudRowActions,
  useCrudUrlState,
} from "@/shared/crud";
import { EmptyState } from "@/shared/components/EmptyState";
import { formatDate } from "@/shared/lib/formatters";
import { toast } from "sonner";
import {
  getApiErrorDetail,
  useAdminDirectoryRestaurants,
  useSetAdminDirectoryRestaurantStatus,
} from "../hooks/use-admin-directory-restaurants";

type StatusAction = {
  id: string;
  name: string;
  nextStatus: "ACTIVE" | "HIDDEN";
} | null;

const statusVariant = (status: "ACTIVE" | "HIDDEN") => {
  return status === "ACTIVE" ? "success" : "muted";
};

export default function RestaurantsListScreen() {
  const navigate = useNavigate();
  const [listState, setListState] = useCrudUrlState({ pageSize: 20, sort: "updatedAt:desc" });
  const [pendingStatusAction, setPendingStatusAction] = useState<StatusAction>(null);

  const filters = useMemo(() => listState.filters ?? {}, [listState.filters]);
  const statusFilter = typeof filters.status === "string" ? filters.status : "";
  const neighborhoodFilter = typeof filters.neighborhood === "string" ? filters.neighborhood : "";
  const dishFilter = typeof filters.dish === "string" ? filters.dish : "";

  const params = useMemo(
    () => ({
      q: listState.q || undefined,
      page: listState.page,
      pageSize: listState.pageSize,
      sort:
        (listState.sort as
          | "updatedAt:desc"
          | "updatedAt:asc"
          | "createdAt:desc"
          | "createdAt:asc"
          | "name:asc"
          | "name:desc"
          | undefined) ?? "updatedAt:desc",
      status: (statusFilter as "ACTIVE" | "HIDDEN" | "") || undefined,
      neighborhood: neighborhoodFilter || undefined,
      dish: dishFilter || undefined,
    }),
    [
      listState.page,
      listState.pageSize,
      listState.q,
      listState.sort,
      statusFilter,
      neighborhoodFilter,
      dishFilter,
    ]
  );

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useAdminDirectoryRestaurants(params);

  const setStatusMutation = useSetAdminDirectoryRestaurantStatus();

  const openStatusDialog = (id: string, name: string, nextStatus: "ACTIVE" | "HIDDEN") => {
    setPendingStatusAction({ id, name, nextStatus });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusAction) {
      return;
    }

    try {
      await setStatusMutation.mutateAsync({
        id: pendingStatusAction.id,
        status: pendingStatusAction.nextStatus,
      });
      toast.success(
        pendingStatusAction.nextStatus === "HIDDEN" ? "Restaurant hidden" : "Restaurant unhidden"
      );
      setPendingStatusAction(null);
    } catch (mutationError) {
      toast.error(getApiErrorDetail(mutationError));
    }
  };

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search restaurants"
          className="w-72 pl-8"
          value={listState.q ?? ""}
          onChange={(event) => setListState({ q: event.target.value, page: 1 })}
        />
      </div>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={statusFilter}
        onChange={(event) =>
          setListState({
            filters: {
              ...filters,
              status: event.target.value || undefined,
            },
            page: 1,
          })
        }
      >
        <option value="">All statuses</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="HIDDEN">HIDDEN</option>
      </select>
      <Input
        placeholder="Neighborhood"
        className="w-44"
        value={neighborhoodFilter}
        onChange={(event) =>
          setListState({
            filters: {
              ...filters,
              neighborhood: event.target.value || undefined,
            },
            page: 1,
          })
        }
      />
      <Input
        placeholder="Dish tag"
        className="w-40"
        value={dishFilter}
        onChange={(event) =>
          setListState({
            filters: {
              ...filters,
              dish: event.target.value || undefined,
            },
            page: 1,
          })
        }
      />
    </div>
  );

  const primaryAction = (
    <Button variant="accent" onClick={() => navigate("/directory/restaurants/new")}>
      <Plus className="h-4 w-4" />
      Add restaurant
    </Button>
  );

  const restaurants = data?.items ?? [];

  return (
    <>
      <CrudListPageLayout
        title="Restaurants"
        subtitle="Manage Berlin Vietnamese directory entries"
        primaryAction={primaryAction}
        toolbar={toolbar}
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading restaurants...</div>
            ) : isError ? (
              <div className="space-y-3 p-8 text-center">
                <p className="text-sm text-destructive">{getApiErrorDetail(error)}</p>
                <Button variant="outline" onClick={() => void refetch()} disabled={isRefetching}>
                  {isRefetching ? "Retrying..." : "Retry"}
                </Button>
              </div>
            ) : restaurants.length === 0 ? (
              <EmptyState
                icon={Store}
                title="No restaurants yet"
                description="Add your first restaurant to publish it in the directory."
                action={primaryAction}
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
                          Neighborhood
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Dish tags
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Updated
                        </th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {restaurants.map((restaurant) => (
                        <tr
                          key={restaurant.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium">{restaurant.name}</div>
                            <div className="text-xs text-muted-foreground">{restaurant.slug}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {restaurant.neighborhoodSlug ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {restaurant.dishTags.length === 0 ? (
                                <span className="text-sm text-muted-foreground">-</span>
                              ) : (
                                restaurant.dishTags.map((tag) => (
                                  <Badge key={tag} variant="outline">
                                    {tag}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={statusVariant(restaurant.status)}>
                              {restaurant.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(restaurant.updatedAt, "en-US")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CrudRowActions
                              primaryAction={{
                                label: "Open",
                                href: `/directory/restaurants/${restaurant.id}`,
                              }}
                              secondaryActions={[
                                {
                                  label: "Edit",
                                  href: `/directory/restaurants/${restaurant.id}/edit`,
                                },
                                {
                                  label: restaurant.status === "ACTIVE" ? "Hide" : "Unhide",
                                  onClick: () =>
                                    openStatusDialog(
                                      restaurant.id,
                                      restaurant.name,
                                      restaurant.status === "ACTIVE" ? "HIDDEN" : "ACTIVE"
                                    ),
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
                  <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
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
      </CrudListPageLayout>

      <ConfirmDeleteDialog
        open={Boolean(pendingStatusAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingStatusAction(null);
          }
        }}
        title={
          pendingStatusAction?.nextStatus === "HIDDEN" ? "Hide restaurant" : "Unhide restaurant"
        }
        description={
          pendingStatusAction
            ? `${pendingStatusAction.name} will be set to ${pendingStatusAction.nextStatus}.`
            : ""
        }
        confirmLabel={pendingStatusAction?.nextStatus === "HIDDEN" ? "Hide" : "Unhide"}
        isLoading={setStatusMutation.isPending}
        onConfirm={() => {
          void confirmStatusChange();
        }}
      />
    </>
  );
}
