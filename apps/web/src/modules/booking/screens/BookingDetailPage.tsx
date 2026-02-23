import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { normalizeError } from "@corely/api-client";
import { ArrowLeft, CalendarClock, Pencil } from "lucide-react";
import { toast } from "sonner";

import { bookingApi } from "@/lib/booking-api";
import { bookingKeys } from "../queries";
import { ConfirmDeleteDialog, invalidateResourceQueries } from "@/shared/crud";
import { Badge, Button, Card, CardContent, Label } from "@corely/ui";

const getStatusVariant = (status: string) => {
  if (status === "CONFIRMED") {
    return "default";
  }
  if (status === "CANCELLED") {
    return "destructive";
  }
  return "secondary";
};

export default function BookingDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();

  const bookingQuery = useQuery({
    queryKey: id ? bookingKeys.detail(id) : ["booking/bookings", "missing-id"],
    queryFn: () => {
      if (!id) {
        throw new Error("Missing booking id");
      }
      return bookingApi.getBooking(id);
    },
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!id) {
        throw new Error("Missing booking id");
      }
      await bookingApi.cancelBooking(id, { reason: "Cancelled from booking details" });
    },
    onSuccess: async () => {
      toast.success("Booking cancelled");
      await invalidateResourceQueries(queryClient, "booking/bookings", id ? { id } : undefined);
      await bookingQuery.refetch();
    },
    onError: (error) => {
      const normalized = normalizeError(error);
      toast.error(normalized.detail || "Failed to cancel booking");
    },
  });

  if (!id) {
    return (
      <div className="p-6 lg:p-8">
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Missing booking id.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/booking/bookings")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">Booking details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View schedule, customer details, and current booking status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/booking/bookings/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="destructive"
                disabled={cancelMutation.isPending || bookingQuery.data?.status === "CANCELLED"}
              >
                Cancel booking
              </Button>
            }
            title="Cancel booking"
            description="This action will mark the booking as cancelled."
            confirmLabel="Cancel booking"
            isLoading={cancelMutation.isPending}
            onConfirm={async () => {
              await cancelMutation.mutateAsync();
            }}
          />
        </div>
      </div>

      {bookingQuery.isLoading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading booking...
          </CardContent>
        </Card>
      ) : null}

      {bookingQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">Failed to load booking.</div>
            <Button variant="outline" size="sm" onClick={() => void bookingQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {bookingQuery.data ? (
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(bookingQuery.data.status)}>
                {bookingQuery.data.status}
              </Badge>
              <Badge variant="outline">
                {bookingQuery.data.referenceNumber || bookingQuery.data.id}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start</Label>
                <p className="mt-1 inline-flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  {new Date(bookingQuery.data.startAt).toLocaleString()}
                </p>
              </div>
              <div>
                <Label>End</Label>
                <p className="mt-1">{new Date(bookingQuery.data.endAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Service offering</Label>
                <p className="mt-1">{bookingQuery.data.serviceOfferingId || "-"}</p>
              </div>
              <div>
                <Label>Booked by name</Label>
                <p className="mt-1">{bookingQuery.data.bookedByName || "-"}</p>
              </div>
              <div>
                <Label>Booked by email</Label>
                <p className="mt-1">{bookingQuery.data.bookedByEmail || "-"}</p>
              </div>
            </div>

            <div>
              <Label>Booked by party id</Label>
              <p className="mt-1">{bookingQuery.data.bookedByPartyId || "-"}</p>
            </div>

            <div>
              <Label>Notes</Label>
              <p className="text-sm text-muted-foreground mt-1">{bookingQuery.data.notes || "-"}</p>
            </div>

            <div>
              <Label>Allocated resources</Label>
              {(bookingQuery.data.allocations ?? []).length ? (
                <div className="mt-2 space-y-2">
                  {bookingQuery.data.allocations?.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <div>Resource: {allocation.resourceId}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Role: {allocation.role} · {new Date(allocation.startAt).toLocaleString()} to{" "}
                        {new Date(allocation.endAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No allocations</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
