import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildListQuery } from "@/lib/api-query-utils";
import { bookingKeys } from "../queries";
import { useCrudUrlState, CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Button,
} from "@corely/ui";
import { Link } from "react-router-dom";
import { PlusIcon, CalendarIcon, CopyIcon } from "lucide-react";
import type { BookingDto } from "@corely/contracts";

export const BookingsPage = () => {
  const [params] = useCrudUrlState();

  const { data, isLoading } = useQuery({
    queryKey: bookingKeys.list(params),
    queryFn: async () => {
      const qs = buildListQuery(params).toString();
      const endpoint = qs ? `/api/booking/bookings?${qs}` : "/api/booking/bookings";
      const res = await apiClient.get<{ items: BookingDto[]; pageInfo: any }>(endpoint);
      return res;
    },
  });

  return (
    <CrudListPageLayout
      title="Bookings"
      subtitle="View and manage customer and internal bookings."
      primaryAction={
        <Button asChild>
          <Link to="/booking/bookings/new">
            <PlusIcon className="w-4 h-4 mr-2" />
            New Booking
          </Link>
        </Button>
      }
    >
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarIcon className="w-8 h-8 text-muted-foreground/30" />
                    <span>No bookings found.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">
                    {booking.referenceNumber}
                    <div className="text-xs text-muted-foreground font-normal mt-1 flex items-center gap-1">
                      {booking.id}{" "}
                      <CopyIcon
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => navigator.clipboard.writeText(booking.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {booking.bookedByName || booking.bookedByEmail || "Internal"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(booking.startAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      to{" "}
                      {new Date(booking.endAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        booking.status === "CONFIRMED"
                          ? "default"
                          : booking.status === "CANCELLED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <CrudRowActions
                      primaryAction={{ label: "View", href: `/booking/bookings/${booking.id}` }}
                      secondaryActions={[{ label: "Delete", onClick: () => {}, destructive: true }]}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </CrudListPageLayout>
  );
};
