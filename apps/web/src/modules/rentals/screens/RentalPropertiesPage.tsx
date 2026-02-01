import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Home } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, useCrudUrlState } from "@/shared/crud";
import { formatDate } from "@/shared/lib/formatters";
import { rentalsApi } from "@/lib/rentals-api";
import { rentalPropertyKeys } from "../queries";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { getPublicRentalUrl } from "@/shared/lib/public-urls";

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Published", value: "PUBLISHED" },
  { label: "Archived", value: "ARCHIVED" },
];

const statusVariant = (status: string) => {
  switch (status) {
    case "PUBLISHED":
      return "success";
    case "ARCHIVED":
      return "muted";
    default:
      return "warning";
  }
};

export default function RentalPropertiesPage() {
  const navigate = useNavigate();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });
  const { activeWorkspace } = useWorkspace();

  const filters = useMemo(() => listState.filters ?? {}, [listState.filters]);
  const statusFilter = typeof filters.status === "string" ? filters.status : "";

  const {
    data: properties,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: rentalPropertyKeys.list({ ...listState, status: statusFilter }),
    queryFn: () =>
      rentalsApi.listProperties({
        status: statusFilter ? (statusFilter as any) : undefined,
        q: listState.q,
      }),
  });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search properties"
          className="pl-8 w-64"
          defaultValue={listState.q ?? ""}
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
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || "Failed to load properties"}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <Button variant="accent" onClick={() => navigate("/rentals/properties/new")}>
      <Plus className="h-4 w-4" />
      New Property
    </Button>
  );

  return (
    <CrudListPageLayout
      title="Vacation Rentals"
      subtitle="Manage your properties and availability"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading properties...</div>
          ) : !properties || properties.length === 0 ? (
            <EmptyState
              icon={Home}
              title="No properties yet"
              description="Add your first vacation rental property to get started."
              action={primaryAction}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Name
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Max Guests
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      Updated
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => {
                    const priceFormatted =
                      property.price && property.currency
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: property.currency,
                          }).format(property.price)
                        : "—";

                    return (
                      <tr
                        key={property.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{property.name}</div>
                          <div className="text-xs text-muted-foreground">{property.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={statusVariant(property.status)}>{property.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{priceFormatted}</td>
                        <td className="px-4 py-3 text-sm">{property.maxGuests ?? "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(property.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{
                              label: "Edit",
                              href: `/rentals/properties/${property.id}/edit`,
                            }}
                            secondaryActions={
                              property.status === "PUBLISHED"
                                ? [
                                    {
                                      label: "View Public Page",
                                      href: getPublicRentalUrl(
                                        property.slug,
                                        activeWorkspace?.slug
                                      ),
                                    },
                                  ]
                                : []
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
}
