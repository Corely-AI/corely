import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { bookingApi } from "@/lib/booking-api";
import { bookingResourceKeys } from "../queries";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import { Badge, Button, Card, CardContent, Label } from "@corely/ui";

export default function ResourceDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const resourceQuery = useQuery({
    queryKey: id ? bookingResourceKeys.detail(id) : ["booking/resources", "missing-id"],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing resource id");
      }
      return bookingApi.getResource(id);
    },
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing resource id");
      }
      await bookingApi.deleteResource(id);
    },
    onSuccess: async () => {
      toast.success("Resource deleted");
      await invalidateResourceQueries(queryClient, "booking/resources");
      navigate("/booking/resources");
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to delete resource");
    },
  });

  if (!id) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Missing resource id.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/booking/resources")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">Resource details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review and manage this booking resource.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/booking/resources/${id}/edit`}>
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
            title="Delete resource"
            description="This action cannot be undone."
            isLoading={deleteMutation.isPending}
            onConfirm={async () => {
              await deleteMutation.mutateAsync();
            }}
          />
        </div>
      </div>

      {resourceQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading resource...
          </CardContent>
        </Card>
      ) : null}

      {resourceQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">Failed to load resource.</div>
            <Button variant="outline" size="sm" onClick={() => void resourceQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {resourceQuery.data ? (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div>
              <Label>Name</Label>
              <p className="text-base mt-1">{resourceQuery.data.name}</p>
            </div>
            <div>
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {resourceQuery.data.description || "-"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Type</Label>
                <p className="mt-1">
                  <Badge variant="secondary">{resourceQuery.data.type}</Badge>
                </p>
              </div>
              <div>
                <Label>Status</Label>
                <p className="mt-1">
                  <Badge variant={resourceQuery.data.isActive ? "default" : "outline"}>
                    {resourceQuery.data.isActive ? "Active" : "Inactive"}
                  </Badge>
                </p>
              </div>
              <div>
                <Label>Location</Label>
                <p className="mt-1">{resourceQuery.data.location || "-"}</p>
              </div>
              <div>
                <Label>Capacity</Label>
                <p className="mt-1">{resourceQuery.data.capacity ?? "-"}</p>
              </div>
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {(resourceQuery.data.tags ?? []).length ? (
                  resourceQuery.data.tags?.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">None</span>
                )}
              </div>
            </div>

            <div>
              <Label>Attributes</Label>
              {resourceQuery.data.attributes ? (
                <pre className="mt-2 rounded-md border border-border bg-muted/30 p-3 text-xs overflow-auto">
                  {JSON.stringify(resourceQuery.data.attributes, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">None</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
