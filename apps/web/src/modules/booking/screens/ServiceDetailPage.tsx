import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { bookingApi } from "@/lib/booking-api";
import { bookingServiceKeys } from "../queries";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import { Badge, Button, Card, CardContent, Label } from "@corely/ui";

export default function ServiceDetailPage() {
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
      toast.success("Service deleted");
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
          <CardContent className="p-6 text-sm text-destructive">Missing service id.</CardContent>
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
            <h1 className="text-h1 text-foreground">Service details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and manage this service offering.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/booking/services/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <ConfirmDeleteDialog
            trigger={
              <Button variant="destructive" disabled={deleteMutation.isPending}>
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            }
            title="Delete service"
            description="This action cannot be undone."
            isLoading={deleteMutation.isPending}
            onConfirm={async () => {
              await deleteMutation.mutateAsync();
            }}
          />
        </div>
      </div>

      {serviceQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading service...
          </CardContent>
        </Card>
      ) : null}

      {serviceQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">Failed to load service.</div>
            <Button variant="outline" size="sm" onClick={() => void serviceQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {serviceQuery.data ? (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>Name</Label>
              <p className="text-base mt-1">{serviceQuery.data.name}</p>
            </div>
            <div>
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {serviceQuery.data.description || "—"}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Duration</Label>
                <p className="mt-1">{serviceQuery.data.durationMinutes} minutes</p>
              </div>
              <div>
                <Label>Buffer before</Label>
                <p className="mt-1">{serviceQuery.data.bufferBeforeMinutes ?? 0} minutes</p>
              </div>
              <div>
                <Label>Buffer after</Label>
                <p className="mt-1">{serviceQuery.data.bufferAfterMinutes ?? 0} minutes</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Price</Label>
                <p className="mt-1">
                  {serviceQuery.data.priceCents != null
                    ? `${serviceQuery.data.priceCents} ${serviceQuery.data.currency || "USD"} (cents)`
                    : "—"}
                </p>
              </div>
              <div>
                <Label>Deposit</Label>
                <p className="mt-1">{serviceQuery.data.depositCents ?? "—"}</p>
              </div>
              <div>
                <Label>Status</Label>
                <p className="mt-1">{serviceQuery.data.isActive ? "Active" : "Inactive"}</p>
              </div>
            </div>
            <div>
              <Label>Required resource types</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(serviceQuery.data.requiredResourceTypes ?? []).length ? (
                  serviceQuery.data.requiredResourceTypes?.map((resourceType) => (
                    <Badge key={resourceType} variant="outline">
                      {resourceType}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>
            <div>
              <Label>Required tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(serviceQuery.data.requiredTags ?? []).length ? (
                  serviceQuery.data.requiredTags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
