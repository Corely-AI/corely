import {
  RestaurantBuildOrderDraftInputSchema,
  RestaurantOrderProposalCardSchema,
  type DraftRestaurantOrderItemInput,
} from "@corely/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { buildToolCtx, validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type RestaurantAiApplication } from "../../application/restaurant-ai.application";
import {
  extractTables,
  findBestProductMatches,
  findTableByPhrase,
  formatModifierReferences,
  mapOrderItemToDraft,
  matchModifiers,
  normalize,
  parseQuantityAndName,
  scoreTextMatch,
  splitSegments,
  summarizeDraftAction,
} from "./restaurant.order-proposal.shared";

export const buildRestaurantBuildOrderDraftTool = (
  app: RestaurantAiApplication
): DomainToolPort => ({
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
              .then((result) => (result ? { order: result.order, session: result.session } : null))
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
      const segment = normalizedText.replace(/^(remove|delete)\s+/i, "").replace(/\s+from.+$/, "");
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
          rationale: "The item has not been sent yet, so it can be removed by updating the draft.",
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
});
