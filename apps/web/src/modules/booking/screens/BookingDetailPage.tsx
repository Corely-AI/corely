import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
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
  const uiCopy = useUiCopy("ui.booking-bookingdetailpage");
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
      toast.success(uiCopy("booking-cancelled"));
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
          <CardContent className="p-6 text-sm text-destructive">
            {uiCopy("missing-booking-id")}
          </CardContent>
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
            <h1 className="text-h1 text-foreground">{uiCopy("booking-details")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {uiCopy("view-schedule-customer-details")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to={`/booking/bookings/${id}/edit`}>
              <Pencil className="h-4 w-4" />
              {uiCopy("edit")}
            </Link>
          </Button>
          <ConfirmDeleteDialog
            trigger={
              <Button
                variant="destructive"
                disabled={cancelMutation.isPending || bookingQuery.data?.status === "CANCELLED"}
              >
                {uiCopy("cancel-booking")}
              </Button>
            }
            title={uiCopy("cancel-booking")}
            description={uiCopy("this-action-will-mark")}
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
            {uiCopy("loading-booking")}
          </CardContent>
        </Card>
      ) : null}

      {bookingQuery.isError ? (
        <Card>
          <CardContent className="p-6 flex items-center justify-between gap-3">
            <div className="text-sm text-destructive">{uiCopy("failed-to-load-booking")}</div>
            <Button variant="outline" size="sm" onClick={() => void bookingQuery.refetch()}>
              {uiCopy("retry")}
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
                <Label>{uiCopy("start")}</Label>
                <p className="mt-1 inline-flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  {new Date(bookingQuery.data.startAt).toLocaleString()}
                </p>
              </div>
              <div>
                <Label>{uiCopy("end")}</Label>
                <p className="mt-1">{new Date(bookingQuery.data.endAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{uiCopy("service-offering")}</Label>
                <p className="mt-1">{bookingQuery.data.serviceOfferingId || "-"}</p>
              </div>
              <div>
                <Label>{uiCopy("booked-by-name")}</Label>
                <p className="mt-1">{bookingQuery.data.bookedByName || "-"}</p>
              </div>
              <div>
                <Label>{uiCopy("booked-by-email")}</Label>
                <p className="mt-1">{bookingQuery.data.bookedByEmail || "-"}</p>
              </div>
            </div>

            <div>
              <Label>{uiCopy("booked-by-party-id")}</Label>
              <p className="mt-1">{bookingQuery.data.bookedByPartyId || "-"}</p>
            </div>

            <div>
              <Label>{uiCopy("notes")}</Label>
              <p className="text-sm text-muted-foreground mt-1">{bookingQuery.data.notes || "-"}</p>
            </div>

            <div>
              <Label>{uiCopy("allocated-resources")}</Label>
              {(bookingQuery.data.allocations ?? []).length ? (
                <div className="mt-2 space-y-2">
                  {bookingQuery.data.allocations?.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm"
                    >
                      <div>
                        {uiCopy("resource") + " "}
                        {allocation.resourceId}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {uiCopy("role") + " "}
                        {allocation.role} · {new Date(allocation.startAt).toLocaleString()}
                        {" " + uiCopy("to")} {new Date(allocation.endAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">{uiCopy("no-allocations")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
