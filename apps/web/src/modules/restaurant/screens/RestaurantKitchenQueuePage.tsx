import { useTranslation } from "react-i18next";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LoadingSkeleton,
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
  const { t } = useTranslation();
  const uiCopy = useUiCopy("ui.restaurant-restaurantkitchenqueuepage");
  const navigate = useNavigate();
  const [status, setStatus] = useState<KitchenTicketStatus | "ALL">("ALL");
  const ticketsQuery = useKitchenTickets(status);
  const updateStatus = useUpdateKitchenTicketStatus();

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">{uiCopy("kitchen-queue")}</h1>
          <p className="text-sm text-muted-foreground">{uiCopy("basic-queue-view-for")}</p>
          <Button variant="outline" onClick={() => navigate("/restaurant/copilot")}>
            {uiCopy("open-restaurant-copilot")}
          </Button>
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
                  <h2 className="font-semibold text-foreground">
                    {uiCopy("ticket") + " "}
                    {ticket.id.slice(0, 8)}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {uiCopy("table") + " "}
                    {ticket.tableId.slice(0, 8)} · {ticket.items.length}
                    {" " + uiCopy("item")}
                    {ticket.items.length === 1 ? "" : uiCopy("s")}
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
                      {item.quantity}
                      {" " + uiCopy("x") + " "}
                      {item.itemName}
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
                    {uiCopy("start")}
                  </Button>
                ) : null}
                {ticket.status === "NEW" || ticket.status === "IN_PROGRESS" ? (
                  <Button
                    variant="secondary"
                    onClick={() => updateStatus.mutate({ ticketId: ticket.id, status: "DONE" })}
                  >
                    {uiCopy("done")}
                  </Button>
                ) : null}
                {ticket.status !== "BUMPED" ? (
                  <Button
                    onClick={() => updateStatus.mutate({ ticketId: ticket.id, status: "BUMPED" })}
                  >
                    {uiCopy("bump")}
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {ticketsQuery.isLoading ? (
          <LoadingSkeleton label={t("common.loading")} variant="cards" />
        ) : ticketsQuery.isError && !ticketsQuery.data ? (
          <p role="alert" className="text-destructive">
            {t("common.error")}
          </p>
        ) : (ticketsQuery.data?.items.length ?? 0) === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {uiCopy("no-kitchen-tickets-for")}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
