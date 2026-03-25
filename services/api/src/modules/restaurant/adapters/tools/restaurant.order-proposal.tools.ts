import {
  RestaurantDraftDiscountRequestInputSchema,
  RestaurantDraftVoidRequestInputSchema,
  RestaurantMenuSearchCardSchema,
  RestaurantOrderProposalCardSchema,
  RestaurantSearchMenuItemsInputSchema,
} from "@corely/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { validationError } from "../../../ai-copilot/infrastructure/tools/tool-utils";
import { type RestaurantAiApplication } from "../../application/restaurant-ai.application";
import { findBestProductMatches } from "./restaurant.order-proposal.shared";

export const buildRestaurantOrderProposalTools = (
  _app: RestaurantAiApplication
): DomainToolPort[] => [
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
];
