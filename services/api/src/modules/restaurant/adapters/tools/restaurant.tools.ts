import {
  RestaurantApprovalSummaryCardSchema,
  RestaurantBuildOrderDraftInputSchema,
  RestaurantDraftDiscountRequestInputSchema,
  RestaurantDraftVoidRequestInputSchema,
  RestaurantFloorAttentionCardSchema,
  RestaurantMenuSearchCardSchema,
  RestaurantOrderProposalCardSchema,
  RestaurantShiftCloseSummaryCardSchema,
  RestaurantSummarizeFloorPlanAttentionInputSchema,
  RestaurantSummarizeKitchenDelaysInputSchema,
  RestaurantSummarizeManagerApprovalsInputSchema,
  RestaurantSummarizeShiftCloseInputSchema,
  RestaurantKitchenSummaryCardSchema,
  RestaurantSearchMenuItemsInputSchema,
  type DraftRestaurantOrderItemInput,
  type FloorPlanRoom,
  type ProductSnapshot,
  type RestaurantModifierGroup,
  type RestaurantOrder,
  type RestaurantOrderItem,
  type RestaurantOrderItemModifier,
} from "@corely/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type RestaurantAiApplication } from "../../application/restaurant-ai.application";

const numberWords: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreTextMatch = (query: string, candidate: string): number => {
  const normalizedQuery = normalize(query);
  const normalizedCandidate = normalize(candidate);
  if (!normalizedQuery || !normalizedCandidate) {
    return 0;
  }
  if (normalizedQuery === normalizedCandidate) {
    return 1;
  }
  if (normalizedCandidate.includes(normalizedQuery)) {
    return 0.92;
  }
  if (normalizedQuery.includes(normalizedCandidate)) {
    return 0.9;
  }

  const queryTokens = normalizedQuery.split(" ");
  const candidateTokens = normalizedCandidate.split(" ");
  const matches = queryTokens.filter((token) =>
    candidateTokens.some((candidateToken) => candidateToken.includes(token))
  ).length;
  return Math.max(0, Math.min(0.89, matches / queryTokens.length));
};

const splitSegments = (sourceText: string): string[] =>
  sourceText
    .split(/\s*(?:,| and )\s*/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

const parseQuantityAndName = (
  segment: string
): { quantity: number; itemText: string; modifierText: string } => {
  const trimmed = segment.trim();
  const match = trimmed.match(
    /^(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(.+)$/i
  );
  if (!match) {
    return { quantity: 1, itemText: trimmed, modifierText: trimmed };
  }

  const quantityText = normalize(match[1]);
  const quantity = /^\d+$/.test(quantityText)
    ? Number(quantityText)
    : (numberWords[quantityText] ?? 1);
  return { quantity, itemText: match[2].trim(), modifierText: match[2].trim() };
};

const mapOrderItemToDraft = (item: RestaurantOrderItem): DraftRestaurantOrderItemInput => ({
  id: item.id,
  catalogItemId: item.catalogItemId,
  itemName: item.itemName,
  sku: item.sku,
  quantity: item.quantity,
  unitPriceCents: item.unitPriceCents,
  taxRateBps: item.taxRateBps,
  modifiers: item.modifiers.map((modifier) => ({
    id: modifier.id,
    modifierGroupId: modifier.modifierGroupId,
    optionName: modifier.optionName,
    quantity: modifier.quantity,
    priceDeltaCents: modifier.priceDeltaCents,
  })),
});

const findBestProductMatches = (query: string, catalogProducts: ProductSnapshot[]) =>
  catalogProducts
    .map((product) => ({
      product,
      confidence: Math.max(
        scoreTextMatch(query, product.name),
        scoreTextMatch(query, product.sku),
        product.barcode ? scoreTextMatch(query, product.barcode) : 0
      ),
    }))
    .filter((match) => match.confidence > 0.15)
    .sort((a, b) => b.confidence - a.confidence);

const matchModifiers = (
  productId: string,
  segment: string,
  modifierGroups: RestaurantModifierGroup[]
): {
  modifiers: DraftRestaurantOrderItemInput["modifiers"];
  missingRequiredModifiers: Array<{
    catalogItemId: string;
    itemName: string;
    modifierGroupId: string;
    modifierGroupName: string;
  }>;
} => {
  const normalizedSegment = normalize(segment);
  const linkedGroups = modifierGroups.filter((group) =>
    group.linkedCatalogItemIds.includes(productId)
  );
  const modifiers: DraftRestaurantOrderItemInput["modifiers"] = [];
  const missingRequiredModifiers: Array<{
    catalogItemId: string;
    itemName: string;
    modifierGroupId: string;
    modifierGroupName: string;
  }> = [];

  for (const group of linkedGroups) {
    const matchedOptions = group.options.filter((option) => {
      const normalizedOption = normalize(option.name);
      return normalizedOption.length > 0 && normalizedSegment.includes(normalizedOption);
    });
    const selected = group.selectionMode === "SINGLE" ? matchedOptions.slice(0, 1) : matchedOptions;

    if (selected.length === 0) {
      if (group.isRequired) {
        missingRequiredModifiers.push({
          catalogItemId: productId,
          itemName: "",
          modifierGroupId: group.id,
          modifierGroupName: group.name,
        });
      }
      continue;
    }

    for (const option of selected) {
      modifiers.push({
        modifierGroupId: group.id,
        optionName: option.name,
        quantity: 1,
        priceDeltaCents: option.priceDeltaCents,
      });
    }
  }

  return { modifiers, missingRequiredModifiers };
};

const summarizeDraftAction = (items: DraftRestaurantOrderItemInput[]) =>
  items.length === 0
    ? "No draft changes proposed."
    : `Prepared ${items.reduce((sum, item) => sum + item.quantity, 0)} item(s) for the draft order.`;

const extractTables = (rooms: FloorPlanRoom[]) =>
  rooms.flatMap((room) => room.tables.map((table) => ({ roomName: room.name, table })));

const findTableByPhrase = (phrase: string, rooms: FloorPlanRoom[]) => {
  const normalizedPhrase = normalize(phrase);
  return extractTables(rooms)
    .map(({ table }) => ({
      table,
      score: Math.max(
        scoreTextMatch(normalizedPhrase, table.name),
        scoreTextMatch(normalizedPhrase, table.id)
      ),
    }))
    .sort((a, b) => b.score - a.score)[0];
};

const formatModifierReferences = (modifiers: RestaurantOrderItemModifier[]) =>
  modifiers.length ? modifiers.map((modifier) => modifier.optionName).join(", ") : "No modifiers";

export const buildRestaurantAiTools = (app: RestaurantAiApplication): DomainToolPort[] => [
  {
    name: "restaurant_searchMenuItems",
    description: "Search restaurant menu items from the current POS product snapshot.",
    kind: "server",
    appId: "restaurant",
    inputSchema: RestaurantSearchMenuItemsInputSchema,
    execute: async ({ input }) => {
      const parsed = RestaurantSearchMenuItemsInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const matches = findBestProductMatches(parsed.data.query, parsed.data.catalogProducts)
        .slice(0, parsed.data.limit)
        .map((match) => ({
          catalogItemId: match.product.productId,
          productName: match.product.name,
          sku: match.product.sku,
          unitPriceCents: match.product.priceCents,
          confidence: match.confidence,
          matchedText: parsed.data.query,
        }));

      return RestaurantMenuSearchCardSchema.parse({
        ok: true,
        cardType: "restaurant.menu-search",
        query: parsed.data.query,
        matches,
        confidence: matches[0]?.confidence ?? 0.2,
        rationale:
          matches.length > 0
            ? "Matched menu items against the POS catalog snapshot."
            : "No menu item matched the provided text in the current POS catalog snapshot.",
        provenance: {
          sourceText: parsed.data.query,
          extractedFields: ["query"],
          referencedEntities: matches.map((match) => ({
            type: "catalog-item",
            id: match.catalogItemId,
            name: match.productName,
          })),
        },
      });
    },
  },
  {
    name: "restaurant_buildOrderDraft",
    description:
      "Turn natural-language restaurant order instructions into a structured proposal card without mutating the order.",
    kind: "server",
    appId: "restaurant",
    inputSchema: RestaurantBuildOrderDraftInputSchema,
    execute: async ({ tenantId, workspaceId, userId, input, toolCallId, runId }) => {
      const parsed = RestaurantBuildOrderDraftInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const ctx = buildToolCtx({ tenantId, workspaceId, userId, toolCallId, runId });
      const sourceText = parsed.data.sourceText.trim();
      const normalizedText = normalize(sourceText);
      const rooms =
        parsed.data.floorPlanRooms.length > 0
          ? parsed.data.floorPlanRooms
          : (await app.getFloorPlan(ctx)).rooms;
      const aggregate = parsed.data.activeOrder
        ? {
            order: parsed.data.activeOrder,
            session:
              parsed.data.tableId && workspaceId
                ? await app
                    .getActiveOrderByTable(tenantId, workspaceId ?? tenantId, parsed.data.tableId)
                    .then((result) => result?.session ?? null)
                : null,
          }
        : parsed.data.orderId
          ? await app
              .getOrderById(tenantId, workspaceId ?? tenantId, parsed.data.orderId)
              .then((result) => (result ? { order: result.order, session: result.session } : null))
          : parsed.data.tableId
            ? await app
                .getActiveOrderByTable(tenantId, workspaceId ?? tenantId, parsed.data.tableId)
                .then((result) =>
                  result ? { order: result.order, session: result.session } : null
                )
            : null;

      if (
        /^(move|transfer)\s+table\b/.test(normalizedText) ||
        /\bmove table\b/.test(normalizedText)
      ) {
        const match = normalizedText.match(/table\s+(.+?)\s+(?:to|into)\s+(.+)$/i);
        const fromPhrase = match?.[1] ?? "";
        const toPhrase = match?.[2] ?? "";
        const destination = findTableByPhrase(toPhrase, rooms);
        if (!aggregate?.order || !aggregate.session || !destination || destination.score < 0.5) {
          return RestaurantOrderProposalCardSchema.parse({
            ok: true,
            cardType: "restaurant.order-proposal",
            title: "Transfer table",
            summary:
              "A transfer was requested but the destination table could not be resolved safely.",
            action: {
              actionType: "NOOP",
              reason: "Destination table is ambiguous or the active order context is missing.",
            },
            ambiguities: destination
              ? []
              : [
                  {
                    field: "toTableId",
                    message: "Choose a destination table before applying the transfer.",
                    options: extractTables(rooms)
                      .slice(0, 8)
                      .map(({ table }) => ({
                        id: table.id,
                        label: table.name,
                      })),
                  },
                ],
            missingRequiredModifiers: [],
            confidence: destination?.score ?? 0.3,
            rationale: fromPhrase
              ? `Requested transfer from table ${fromPhrase}.`
              : "Requested transfer.",
            provenance: {
              sourceText,
              extractedFields: ["fromTable", "toTable"],
            },
          });
        }

        return RestaurantOrderProposalCardSchema.parse({
          ok: true,
          cardType: "restaurant.order-proposal",
          title: "Transfer table",
          summary: `Move the active check to ${destination.table.name}.`,
          action: {
            actionType: "TRANSFER_TABLE",
            transfer: {
              orderId: aggregate.order.id,
              tableSessionId: aggregate.session.id,
              toTableId: destination.table.id,
            },
          },
          ambiguities: [],
          missingRequiredModifiers: [],
          confidence: destination.score,
          rationale: "Matched the destination table against the current floor plan.",
          provenance: {
            sourceText,
            referencedEntities: [
              {
                type: "restaurant-table",
                id: destination.table.id,
                name: destination.table.name,
              },
            ],
            extractedFields: ["transfer"],
          },
        });
      }

      if (
        (/\bremove\b/.test(normalizedText) || /\bdelete\b/.test(normalizedText)) &&
        aggregate?.order
      ) {
        const segment = normalizedText
          .replace(/^(remove|delete)\s+/i, "")
          .replace(/\s+from.+$/, "");
        const matchedItem = aggregate.order.items
          .map((item) => ({
            item,
            confidence: Math.max(
              scoreTextMatch(segment, item.itemName),
              scoreTextMatch(segment, item.sku)
            ),
          }))
          .sort((a, b) => b.confidence - a.confidence)[0];

        if (!matchedItem || matchedItem.confidence < 0.45) {
          return RestaurantOrderProposalCardSchema.parse({
            ok: true,
            cardType: "restaurant.order-proposal",
            title: "Remove item",
            summary: "No matching existing order item could be resolved safely.",
            action: { actionType: "NOOP", reason: "Order item match is ambiguous." },
            ambiguities: aggregate.order.items.map((item) => ({
              field: "orderItemId",
              message: "Choose which item to remove.",
              options: [
                {
                  id: item.id,
                  label: item.itemName,
                  detail: formatModifierReferences(item.modifiers),
                },
              ],
            })),
            missingRequiredModifiers: [],
            confidence: matchedItem?.confidence ?? 0.2,
            rationale: "Tried to match the removal request against current order items.",
            provenance: { sourceText, extractedFields: ["remove"] },
          });
        }

        if (aggregate.order.status === "DRAFT" && matchedItem.item.sentQuantity === 0) {
          const nextItems = aggregate.order.items
            .filter((item) => item.id !== matchedItem.item.id)
            .map(mapOrderItemToDraft);

          return RestaurantOrderProposalCardSchema.parse({
            ok: true,
            cardType: "restaurant.order-proposal",
            title: "Update draft order",
            summary: `Remove ${matchedItem.item.itemName} from the draft order.`,
            action: {
              actionType: "REPLACE_DRAFT",
              orderId: aggregate.order.id,
              tableId: aggregate.order.tableId,
              discountCents: aggregate.order.discountCents,
              items: nextItems,
            },
            ambiguities: [],
            missingRequiredModifiers: [],
            confidence: matchedItem.confidence,
            rationale:
              "The item has not been sent yet, so it can be removed by updating the draft.",
            provenance: {
              sourceText,
              extractedFields: ["remove"],
              referencedEntities: [
                {
                  type: "restaurant-order-item",
                  id: matchedItem.item.id,
                  name: matchedItem.item.itemName,
                },
              ],
            },
          });
        }

        return RestaurantOrderProposalCardSchema.parse({
          ok: true,
          cardType: "restaurant.order-proposal",
          title: "Request void",
          summary: `Request a void for ${matchedItem.item.itemName}.`,
          action: {
            actionType: "REQUEST_VOID",
            request: {
              orderItemId: matchedItem.item.id,
              reason: `Operator requested removal: ${sourceText}`.slice(0, 200),
            },
          },
          ambiguities: [],
          missingRequiredModifiers: [],
          confidence: matchedItem.confidence,
          rationale: "The item is no longer draft-only, so a void request is required.",
          provenance: {
            sourceText,
            extractedFields: ["void-request"],
            referencedEntities: [
              {
                type: "restaurant-order-item",
                id: matchedItem.item.id,
                name: matchedItem.item.itemName,
              },
            ],
          },
        });
      }

      const draftBaseItems = aggregate?.order?.items.map(mapOrderItemToDraft) ?? [];
      const appendedItems: DraftRestaurantOrderItemInput[] = [];
      const ambiguities: Array<{
        field: string;
        message: string;
        options: { id: string; label: string; detail?: string }[];
      }> = [];
      const missingRequiredModifiers: Array<{
        catalogItemId: string;
        itemName: string;
        modifierGroupId: string;
        modifierGroupName: string;
      }> = [];

      for (const segment of splitSegments(sourceText)) {
        const parsedSegment = parseQuantityAndName(segment);
        const matches = findBestProductMatches(parsedSegment.itemText, parsed.data.catalogProducts);
        const best = matches[0];
        const second = matches[1];

        if (
          !best ||
          best.confidence < 0.45 ||
          (second && best.confidence - second.confidence < 0.1)
        ) {
          ambiguities.push({
            field: "catalogItemId",
            message: `Choose the menu item for "${parsedSegment.itemText}".`,
            options: matches.slice(0, 5).map((match) => ({
              id: match.product.productId,
              label: match.product.name,
              detail: match.product.sku,
            })),
          });
          continue;
        }

        const modifierResult = matchModifiers(
          best.product.productId,
          parsedSegment.modifierText,
          parsed.data.modifierGroups
        );
        missingRequiredModifiers.push(
          ...modifierResult.missingRequiredModifiers.map((item) => ({
            ...item,
            itemName: best.product.name,
          }))
        );

        appendedItems.push({
          catalogItemId: best.product.productId,
          itemName: best.product.name,
          sku: best.product.sku,
          quantity: parsedSegment.quantity,
          unitPriceCents: best.product.priceCents,
          taxRateBps: best.product.taxable ? 700 : 0,
          modifiers: modifierResult.modifiers,
        });
      }

      const action =
        ambiguities.length > 0 && appendedItems.length === 0
          ? { actionType: "NOOP" as const, reason: "The requested menu items are ambiguous." }
          : {
              actionType: "REPLACE_DRAFT" as const,
              orderId: aggregate?.order?.id ?? parsed.data.orderId ?? "",
              tableId: aggregate?.order?.tableId ?? parsed.data.tableId ?? "",
              discountCents: aggregate?.order?.discountCents ?? 0,
              items: [...draftBaseItems, ...appendedItems],
            };

      return RestaurantOrderProposalCardSchema.parse({
        ok: true,
        cardType: "restaurant.order-proposal",
        title: "Draft order proposal",
        summary:
          action.actionType === "NOOP"
            ? "The request needs clarification before a draft can be proposed."
            : summarizeDraftAction(action.items),
        action,
        ambiguities,
        missingRequiredModifiers,
        confidence:
          ambiguities.length > 0
            ? 0.45
            : appendedItems.length > 0
              ? Math.min(
                  0.95,
                  appendedItems.reduce((sum, item) => {
                    const match = findBestProductMatches(
                      item.itemName,
                      parsed.data.catalogProducts
                    )[0];
                    return sum + (match?.confidence ?? 0.5);
                  }, 0) / appendedItems.length
                )
              : 0.25,
        rationale:
          action.actionType === "NOOP"
            ? "The current menu match confidence is not high enough to apply safely."
            : "Matched requested menu items against the POS catalog snapshot and preserved existing draft items.",
        provenance: {
          sourceText,
          extractedFields: ["items", "modifiers"],
          referencedEntities: appendedItems.map((item) => ({
            type: "catalog-item",
            id: item.catalogItemId,
            name: item.itemName,
          })),
        },
      });
    },
  },
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
    name: "restaurant_draftVoidRequest",
    description: "Draft a manager-readable restaurant void request proposal without applying it.",
    kind: "server",
    appId: "restaurant",
    inputSchema: RestaurantDraftVoidRequestInputSchema,
    execute: async ({ input }) => {
      const parsed = RestaurantDraftVoidRequestInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      return RestaurantOrderProposalCardSchema.parse({
        ok: true,
        cardType: "restaurant.order-proposal",
        title: "Void request proposal",
        summary: `Prepare a void request for ${parsed.data.itemName ?? "the selected item"}.`,
        action: {
          actionType: "REQUEST_VOID",
          request: {
            orderItemId: parsed.data.orderItemId,
            reason: parsed.data.reason.trim(),
          },
        },
        ambiguities: [],
        missingRequiredModifiers: [],
        confidence: 0.94,
        rationale: "Normalized the operator reason into the standard void request payload.",
        provenance: {
          sourceText: parsed.data.sourceText ?? parsed.data.reason,
          extractedFields: ["orderItemId", "reason"],
          referencedEntities: [
            {
              type: "restaurant-order",
              id: parsed.data.orderId,
              name: parsed.data.orderId,
            },
          ],
        },
      });
    },
  },
  {
    name: "restaurant_draftDiscountRequest",
    description:
      "Draft a manager-readable restaurant discount request proposal without applying it.",
    kind: "server",
    appId: "restaurant",
    inputSchema: RestaurantDraftDiscountRequestInputSchema,
    execute: async ({ input }) => {
      const parsed = RestaurantDraftDiscountRequestInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      return RestaurantOrderProposalCardSchema.parse({
        ok: true,
        cardType: "restaurant.order-proposal",
        title: "Discount request proposal",
        summary: `Prepare a discount request for ${parsed.data.amountCents} cents.`,
        action: {
          actionType: "REQUEST_DISCOUNT",
          request: {
            orderId: parsed.data.orderId,
            amountCents: parsed.data.amountCents,
            reason: parsed.data.reason.trim(),
          },
        },
        ambiguities: [],
        missingRequiredModifiers: [],
        confidence: 0.95,
        rationale: "Normalized the operator reason into the standard discount request payload.",
        provenance: {
          sourceText: parsed.data.sourceText ?? parsed.data.reason,
          extractedFields: ["orderId", "amountCents", "reason"],
          referencedEntities: [
            {
              type: "restaurant-order",
              id: parsed.data.orderId,
              name: parsed.data.orderId,
            },
          ],
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
