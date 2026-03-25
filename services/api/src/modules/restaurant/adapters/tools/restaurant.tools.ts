import {
  RestaurantApprovalSummaryCardSchema,
  RestaurantFloorAttentionCardSchema,
  RestaurantKitchenSummaryCardSchema,
  RestaurantShiftCloseSummaryCardSchema,
  RestaurantSummarizeFloorPlanAttentionInputSchema,
  RestaurantSummarizeKitchenDelaysInputSchema,
  RestaurantSummarizeManagerApprovalsInputSchema,
  RestaurantSummarizeShiftCloseInputSchema,
} from "@corely/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type RestaurantAiApplication } from "../../application/restaurant-ai.application";
import { buildRestaurantBuildOrderDraftTool } from "./restaurant.build-order-draft.tool";
import { buildRestaurantOrderProposalTools } from "./restaurant.order-proposal.tools";

export const buildRestaurantAiTools = (app: RestaurantAiApplication): DomainToolPort[] => [
  ...buildRestaurantOrderProposalTools(app),
  buildRestaurantBuildOrderDraftTool(app),
  {
    name: "restaurant_summarizeFloorPlanAttention",
    description: "Summarize which restaurant tables need attention based on floor-plan status.",
    kind: "server",
    appId: "restaurant",
    inputSchema: RestaurantSummarizeFloorPlanAttentionInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = RestaurantSummarizeFloorPlanAttentionInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const rooms =
        parsed.data.rooms.length > 0
          ? parsed.data.rooms
          : (
              await app.getFloorPlan(
                buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
              )
            ).rooms;

      const items = rooms.flatMap((room) =>
        room.tables
          .filter((table) => table.availabilityStatus !== "AVAILABLE")
          .map((table) => ({
            tableId: table.id,
            tableName: table.name,
            status: table.availabilityStatus,
            reason:
              table.availabilityStatus === "OCCUPIED"
                ? "Active table session in progress."
                : table.availabilityStatus === "DIRTY"
                  ? "Table needs cleaning before reuse."
                  : "Table is currently blocked from service.",
            activeOrderId: table.activeOrderId,
            activeSessionId: table.activeSessionId,
          }))
      );

      return RestaurantFloorAttentionCardSchema.parse({
        ok: true,
        cardType: "restaurant.floor-attention",
        summary:
          items.length === 0
            ? "All configured tables are currently available."
            : `${items.length} table(s) currently need operator attention.`,
        items,
        confidence: 0.98,
        rationale: "Computed directly from the current floor-plan table statuses.",
        provenance: {
          extractedFields: ["availabilityStatus", "activeOrderId", "activeSessionId"],
          referencedEntities: items.map((item) => ({
            type: "restaurant-table",
            id: item.tableId,
            name: item.tableName,
          })),
        },
      });
    },
  },
  {
    name: "restaurant_summarizeKitchenDelays",
    description: "Summarize delayed or blocked kitchen tickets from observable ticket state.",
    kind: "server",
    appId: "restaurant",
    inputSchema: RestaurantSummarizeKitchenDelaysInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = RestaurantSummarizeKitchenDelaysInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const tickets =
        parsed.data.tickets.length > 0
          ? parsed.data.tickets
          : (
              await app.listKitchenTickets(
                buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId })
              )
            ).items;
      const now = Date.now();
      const delayed = tickets
        .filter((ticket) => ticket.status !== "BUMPED")
        .map((ticket) => ({
          ticketId: ticket.id,
          orderId: ticket.orderId,
          tableId: ticket.tableId,
          stationId: ticket.stationId,
          status: ticket.status,
          ageMinutes: Math.max(0, Math.floor((now - new Date(ticket.sentAt).getTime()) / 60000)),
          reason:
            ticket.status === "NEW"
              ? "Ticket has not started yet."
              : ticket.status === "IN_PROGRESS"
                ? "Ticket is still cooking."
                : "Ticket is ready but not bumped.",
        }))
        .filter((ticket) => ticket.ageMinutes >= parsed.data.delayedThresholdMinutes)
        .sort((a, b) => b.ageMinutes - a.ageMinutes);

      return RestaurantKitchenSummaryCardSchema.parse({
        ok: true,
        cardType: "restaurant.kitchen-summary",
        summary:
          delayed.length === 0
            ? "No kitchen tickets are currently delayed beyond the configured threshold."
            : `${delayed.length} ticket(s) are delayed more than ${parsed.data.delayedThresholdMinutes} minutes.`,
        delayedCount: delayed.length,
        items: delayed,
        confidence: 0.97,
        rationale: "Computed from ticket timestamps and current kitchen statuses.",
        provenance: {
          extractedFields: ["sentAt", "status"],
          referencedEntities: delayed.map((item) => ({
            type: "kitchen-ticket",
            id: item.ticketId,
            name: item.ticketId,
          })),
        },
      });
    },
  },
  {
    name: "restaurant_summarizeManagerApprovals",
    description:
      "Summarize pending and recently applied restaurant approval requests for managers.",
    kind: "server",
    appId: "restaurant",
    inputSchema: RestaurantSummarizeManagerApprovalsInputSchema,
    execute: async ({ tenantId, workspaceId, input }) => {
      const parsed = RestaurantSummarizeManagerApprovalsInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const statuses: Array<"PENDING" | "APPLIED"> = parsed.data.includeApplied
        ? ["PENDING", "APPLIED"]
        : ["PENDING"];
      const items = await app.listApprovalRequests(tenantId, workspaceId ?? tenantId, {
        statuses,
        limit: 12,
      });

      return RestaurantApprovalSummaryCardSchema.parse({
        ok: true,
        cardType: "restaurant.approval-summary",
        summary:
          items.length === 0
            ? "There are no restaurant approval requests matching the current filter."
            : `${items.filter((item) => item.status === "PENDING").length} approval request(s) are pending review.`,
        items: items.map((item) => ({
          approvalRequestId: item.id,
          orderId: item.orderId,
          orderItemId: item.orderItemId,
          type: item.type,
          status: item.status,
          amountCents: item.amountCents,
          reason: item.reason,
          requestedByUserId: item.requestedByUserId,
          createdAt: item.createdAt,
        })),
        confidence: 0.98,
        rationale: "Fetched directly from restaurant approval request state.",
        provenance: {
          extractedFields: ["type", "status", "reason", "amountCents"],
          referencedEntities: items.map((item) => ({
            type: "restaurant-approval",
            id: item.id,
            name: item.type,
          })),
        },
      });
    },
  },
  {
    name: "restaurant_summarizeShiftClose",
    description: "Summarize end-of-shift restaurant activity, exceptions, and variance hints.",
    kind: "server",
    appId: "restaurant",
    inputSchema: RestaurantSummarizeShiftCloseInputSchema,
    execute: async ({ tenantId, workspaceId, input }) => {
      const parsed = RestaurantSummarizeShiftCloseInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const pendingApprovals =
        parsed.data.pendingApprovals > 0
          ? parsed.data.pendingApprovals
          : (
              await app.listApprovalRequests(tenantId, workspaceId ?? tenantId, {
                statuses: ["PENDING"],
                limit: 50,
              })
            ).length;
      const varianceCents =
        parsed.data.countedCashCents == null
          ? null
          : parsed.data.countedCashCents - parsed.data.expectedCashCents;
      const anomalies = [
        parsed.data.openTables > 0 ? `${parsed.data.openTables} table(s) are still open.` : null,
        parsed.data.unpaidOrders > 0
          ? `${parsed.data.unpaidOrders} order(s) are not fully settled.`
          : null,
        pendingApprovals > 0 ? `${pendingApprovals} approval request(s) still need review.` : null,
        varianceCents !== null && Math.abs(varianceCents) > 0
          ? `Cash variance is ${varianceCents > 0 ? "over" : "under"} by ${Math.abs(varianceCents)} cents.`
          : null,
      ].filter((value): value is string => Boolean(value));

      return RestaurantShiftCloseSummaryCardSchema.parse({
        ok: true,
        cardType: "restaurant.shift-close-summary",
        summary:
          anomalies.length === 0
            ? "Shift is in a clean state to close based on current restaurant and cash signals."
            : "Shift close needs review before confirmation.",
        metrics: {
          openTables: parsed.data.openTables,
          sentOrders: parsed.data.sentOrders,
          unpaidOrders: parsed.data.unpaidOrders,
          pendingApprovals,
          expectedCashCents: parsed.data.expectedCashCents,
          countedCashCents: parsed.data.countedCashCents ?? null,
          varianceCents,
        },
        anomalies,
        confidence: 0.97,
        rationale:
          "Summarized from current shift-close cash inputs and pending restaurant exceptions.",
        provenance: {
          extractedFields: ["expectedCashCents", "countedCashCents", "openTables", "unpaidOrders"],
          referencedEntities: [],
        },
      });
    },
  },
];
