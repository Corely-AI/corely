import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Home, Tags } from "lucide-react";
import { LoadingSkeleton, Button } from "@corely/ui";
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
  const uiCopy = useUiCopy("ui.rentals-rentalpropertiespage");
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
      toast.success(uiCopy("global-rental-contact-updated"));
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
          placeholder={uiCopy("search-properties")}
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
          {(error as Error)?.message || uiCopy("failed-to-load-properties")}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <>
      <Button variant="outline" onClick={() => navigate("/rentals/categories")}>
        <Tags className="h-4 w-4" />
        {uiCopy("categories")}
      </Button>
      <Button variant="accent" onClick={() => navigate("/rentals/properties/new")}>
        <Plus className="h-4 w-4" />
        {uiCopy("new-property")}
      </Button>
    </>
  );

  return (
    <CrudListPageLayout
      title={uiCopy("vacation-rentals")}
      subtitle="Manage your properties and availability"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{uiCopy("global-host-contact")}</h2>
              <p className="text-sm text-muted-foreground">{uiCopy("this-contact-is-used")}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => saveSettingsMutation.mutate()}
              disabled={saveSettingsMutation.isPending || isLoadingSettings}
            >
              {uiCopy("save-contact")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>{uiCopy("contact-method")}</Label>
              <Select
                value={hostContactMethod ?? "NONE"}
                onValueChange={(value) =>
                  setHostContactMethod(value === "NONE" ? null : (value as RentalHostContactMethod))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={uiCopy("choose-contact-method")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">{uiCopy("not-configured")}</SelectItem>
                  <SelectItem value="PHONE">{uiCopy("phone-call")}</SelectItem>
                  <SelectItem value="EMAIL">{uiCopy("email")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              {hostContactMethod === "EMAIL" ? (
                <>
                  <Label htmlFor="global-host-email">{uiCopy("host-email")}</Label>
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
                  <Label htmlFor="global-host-phone">{uiCopy("host-phone")}</Label>
                  <Input
                    id="global-host-phone"
                    value={hostContactPhone}
                    onChange={(event) => setHostContactPhone(event.target.value)}
                    placeholder="+1 555 123 4567"
                  />
                </>
              ) : (
                <>
                  <Label>{uiCopy("host-contact-value")}</Label>
                  <div className="h-10 rounded-md border border-dashed px-3 text-sm text-muted-foreground flex items-center">
                    {uiCopy("select-a-method-to")}
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
            <LoadingSkeleton variant="list" label={uiCopy("loading-properties")} />
          ) : !properties || properties.length === 0 ? (
            <EmptyState
              icon={Home}
              title={uiCopy("no-properties-yet")}
              description={uiCopy("add-your-first-vacation")}
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
                      {uiCopy("status")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("max-guests")}
                    </th>
                    <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                      {uiCopy("updated")}
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
