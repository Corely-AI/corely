import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { bookingApi } from "@/lib/booking-api";
import { bookingServiceKeys } from "../queries";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import { LoadingSkeleton, Badge, Button, Card, CardContent, Label } from "@corely/ui";

export default function ServiceDetailPage() {
  const uiCopy = useUiCopy("ui.booking-servicedetailpage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const serviceQuery = useQuery({
    queryKey: id ? bookingServiceKeys.detail(id) : ["booking/services", "missing-id"],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing service id");
      }
      return bookingApi.getService(id);
    },
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing service id");
      }
      await bookingApi.deleteService(id);
    },
    onSuccess: async () => {
      toast.success(uiCopy("service-deleted"));
      await invalidateResourceQueries(queryClient, "booking/services");
      navigate("/booking/services");
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to delete service");
    },
  });

  if (!id) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="p-6 text-sm text-destructive">
            {uiCopy("missing-service-id")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/booking/services")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{uiCopy("service-details")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{uiCopy("review-and-manage-this")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/booking/services/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              {uiCopy("edit")}
            </Link>
          </Button>
          <ConfirmDeleteDialog
            trigger={
              <Button variant="destructive" disabled={deleteMutation.isPending}>
                <Trash2 className="h-4 w-4" />
                {uiCopy("delete")}
              </Button>
            }
            title={uiCopy("delete-service")}
            description={uiCopy("this-action-cannot-be")}
            isLoading={deleteMutation.isPending}
            onConfirm={async () => {
              await deleteMutation.mutateAsync();
            }}
          />
        </div>
      </div>

      {serviceQuery.isLoading ? (
        <LoadingSkeleton variant="detail" label={uiCopy("loading-service")} />
      ) : null}

      {serviceQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">{uiCopy("failed-to-load-service")}</div>
            <Button variant="outline" size="sm" onClick={() => void serviceQuery.refetch()}>
              {uiCopy("retry")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {serviceQuery.data ? (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>{uiCopy("name")}</Label>
              <p className="text-base mt-1">{serviceQuery.data.name}</p>
            </div>
            <div>
              <Label>{uiCopy("description")}</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {serviceQuery.data.description || "—"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{uiCopy("duration")}</Label>
                <p className="mt-1">
                  {serviceQuery.data.durationMinutes}
                  {" " + uiCopy("minutes")}
                </p>
              </div>
              <div>
                <Label>{uiCopy("buffer-before")}</Label>
                <p className="mt-1">
                  {serviceQuery.data.bufferBeforeMinutes ?? 0}
                  {" " + uiCopy("minutes")}
                </p>
              </div>
              <div>
                <Label>{uiCopy("buffer-after")}</Label>
                <p className="mt-1">
                  {serviceQuery.data.bufferAfterMinutes ?? 0}
                  {" " + uiCopy("minutes")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{uiCopy("price")}</Label>
                <p className="mt-1">
                  {serviceQuery.data.priceCents != null
                    ? `${serviceQuery.data.priceCents} ${serviceQuery.data.currency || "USD"} (cents)`
                    : "—"}
                </p>
              </div>
              <div>
                <Label>{uiCopy("deposit")}</Label>
                <p className="mt-1">{serviceQuery.data.depositCents ?? "—"}</p>
              </div>
              <div>
                <Label>{uiCopy("status")}</Label>
                <p className="mt-1">
                  {serviceQuery.data.isActive ? uiCopy("active") : uiCopy("inactive")}
                </p>
              </div>
            </div>
            <div>
              <Label>{uiCopy("required-resource-types")}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(serviceQuery.data.requiredResourceTypes ?? []).length ? (
                  serviceQuery.data.requiredResourceTypes?.map((resourceType) => (
                    <Badge key={resourceType} variant="outline">
                      {resourceType}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{uiCopy("none")}</span>
                )}
              </div>
            </div>
            <div>
              <Label>{uiCopy("required-tags")}</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(serviceQuery.data.requiredTags ?? []).length ? (
                  serviceQuery.data.requiredTags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">{uiCopy("none")}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
