import React, { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@corely/ui";
import type { KitchenTicketStatus } from "@corely/contracts";
import { useKitchenTickets, useUpdateKitchenTicketStatus } from "../hooks/use-restaurant-admin";

const ticketStatuses: Array<KitchenTicketStatus | "ALL"> = [
  "ALL",
  "NEW",
  "IN_PROGRESS",
  "DONE",
  "BUMPED",
];

export default function RestaurantKitchenQueuePage() {
  const [status, setStatus] = useState<KitchenTicketStatus | "ALL">("ALL");
  const ticketsQuery = useKitchenTickets(status);
  const updateStatus = useUpdateKitchenTicketStatus();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">Kitchen queue</h1>
          <p className="text-sm text-muted-foreground">
            Basic queue view for restaurant tickets created from sent orders.
          </p>
        </div>
        <div className="w-48">
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as KitchenTicketStatus | "ALL")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ticketStatuses.map((ticketStatus) => (
                <SelectItem key={ticketStatus} value={ticketStatus}>
                  {ticketStatus}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {ticketsQuery.data?.items.map((ticket) => (
          <Card key={ticket.id}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-foreground">Ticket {ticket.id.slice(0, 8)}</h2>
                  <p className="text-sm text-muted-foreground">
                    Table {ticket.tableId.slice(0, 8)} · {ticket.items.length} item
                    {ticket.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Badge variant={ticket.status === "NEW" ? "default" : "secondary"}>
                  {ticket.status}
                </Badge>
              </div>

              <div className="space-y-2">
                {ticket.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <div className="font-medium text-foreground">
                      {item.quantity} x {item.itemName}
                    </div>
                    {item.modifiers.length > 0 ? (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {item.modifiers.map((modifier) => modifier.optionName).join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {ticket.status === "NEW" ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      updateStatus.mutate({ ticketId: ticket.id, status: "IN_PROGRESS" })
                    }
                  >
                    Start
                  </Button>
                ) : null}
                {ticket.status === "NEW" || ticket.status === "IN_PROGRESS" ? (
                  <Button
                    variant="secondary"
                    onClick={() => updateStatus.mutate({ ticketId: ticket.id, status: "DONE" })}
                  >
                    Done
                  </Button>
                ) : null}
                {ticket.status !== "BUMPED" ? (
                  <Button
                    onClick={() => updateStatus.mutate({ ticketId: ticket.id, status: "BUMPED" })}
                  >
                    Bump
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {!ticketsQuery.isLoading && (ticketsQuery.data?.items.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No kitchen tickets for the selected filter.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
