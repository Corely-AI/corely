import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Home, Tags } from "lucide-react";
import { Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Input } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { Label } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, useCrudUrlState } from "@/shared/crud";
import { formatDate } from "@/shared/lib/formatters";
import { rentalsApi } from "@/lib/rentals-api";
import { rentalPropertyKeys, rentalsPublicKeys } from "../queries";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { getPublicRentalUrl } from "@/shared/lib/public-urls";
import { toast } from "sonner";
import type { RentalHostContactMethod } from "@corely/contracts";

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
  const queryClient = useQueryClient();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });
  const { activeWorkspace } = useWorkspace();
  const [hostContactMethod, setHostContactMethod] = useState<RentalHostContactMethod | null>(null);
  const [hostContactEmail, setHostContactEmail] = useState("");
  const [hostContactPhone, setHostContactPhone] = useState("");

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

  const { data: settingsResult, isLoading: isLoadingSettings } = useQuery({
    queryKey: rentalsPublicKeys.adminSettings(),
    queryFn: () => rentalsApi.getSettings(),
  });

  useEffect(() => {
    if (!settingsResult) {
      return;
    }
    setHostContactMethod(settingsResult.settings.hostContactMethod);
    setHostContactEmail(settingsResult.settings.hostContactEmail ?? "");
    setHostContactPhone(settingsResult.settings.hostContactPhone ?? "");
  }, [settingsResult]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const normalizedEmail = hostContactEmail.trim();
      const normalizedPhone = hostContactPhone.trim();

      if (hostContactMethod === "EMAIL" && !normalizedEmail) {
        throw new Error("Email is required when method is Email.");
      }
      if (hostContactMethod === "PHONE" && !normalizedPhone) {
        throw new Error("Phone is required when method is Phone.");
      }

      return rentalsApi.updateSettings({
        hostContactMethod,
        hostContactEmail: hostContactMethod === "EMAIL" ? normalizedEmail : null,
        hostContactPhone: hostContactMethod === "PHONE" ? normalizedPhone : null,
      });
    },
    onSuccess: async (updated) => {
      setHostContactMethod(updated.settings.hostContactMethod);
      setHostContactEmail(updated.settings.hostContactEmail ?? "");
      setHostContactPhone(updated.settings.hostContactPhone ?? "");
      await queryClient.invalidateQueries({ queryKey: rentalsPublicKeys.adminSettings() });
      await queryClient.invalidateQueries({
        queryKey: rentalsPublicKeys.settings(activeWorkspace?.slug),
      });
      toast.success("Global rental contact updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update rental contact");
    },
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
    <>
      <Button variant="outline" onClick={() => navigate("/rentals/categories")}>
        <Tags className="h-4 w-4" />
        Categories
      </Button>
      <Button variant="accent" onClick={() => navigate("/rentals/properties/new")}>
        <Plus className="h-4 w-4" />
        New Property
      </Button>
    </>
  );

  return (
    <CrudListPageLayout
      title="Vacation Rentals"
      subtitle="Manage your properties and availability"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Global Host Contact</h2>
              <p className="text-sm text-muted-foreground">
                This contact is used for all public rental detail pages.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending || isLoadingSettings}
            >
              Save Contact
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Contact Method</Label>
              <Select
                value={hostContactMethod ?? "NONE"}
                onValueChange={(value) =>
                  setHostContactMethod(value === "NONE" ? null : (value as RentalHostContactMethod))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose contact method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Not configured</SelectItem>
                  <SelectItem value="PHONE">Phone call</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              {hostContactMethod === "EMAIL" ? (
                <>
                  <Label htmlFor="global-host-email">Host Email</Label>
                  <Input
                    id="global-host-email"
                    type="email"
                    value={hostContactEmail}
                    onChange={(event) => setHostContactEmail(event.target.value)}
                    placeholder="host@example.com"
                  />
                </>
              ) : hostContactMethod === "PHONE" ? (
                <>
                  <Label htmlFor="global-host-phone">Host Phone</Label>
                  <Input
                    id="global-host-phone"
                    value={hostContactPhone}
                    onChange={(event) => setHostContactPhone(event.target.value)}
                    placeholder="+1 555 123 4567"
                  />
                </>
              ) : (
                <>
                  <Label>Host Contact Value</Label>
                  <div className="h-10 rounded-md border border-dashed px-3 text-sm text-muted-foreground flex items-center">
                    Select a method to provide host contact details.
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
