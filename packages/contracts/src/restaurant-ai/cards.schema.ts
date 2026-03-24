import { z } from "zod";
import { ProvenanceSchema } from "../crm/ai-proposals/party-proposal.types";
import {
  DraftRestaurantOrderItemInputSchema,
  RequestRestaurantDiscountInputSchema,
  RequestRestaurantVoidInputSchema,
  TransferRestaurantTableInputSchema,
} from "../restaurant/schema";
import {
  FloorPlanRoomSchema,
  KitchenTicketSchema,
  KitchenTicketStatusSchema,
  RestaurantApprovalStatusSchema,
  RestaurantApprovalTypeSchema,
  RestaurantModifierGroupSchema,
  RestaurantOrderSchema,
  RestaurantTableAvailabilityStatusSchema,
} from "../restaurant/models";
import { ProductSnapshotSchema } from "../pos/get-catalog-snapshot.schema";

export const RestaurantAiCardKindSchema = z.enum([
  "restaurant.order-proposal",
  "restaurant.menu-search",
  "restaurant.floor-attention",
  "restaurant.kitchen-summary",
  "restaurant.approval-summary",
  "restaurant.shift-close-summary",
]);
export type RestaurantAiCardKind = z.infer<typeof RestaurantAiCardKindSchema>;

export const RestaurantAiAmbiguityOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  detail: z.string().optional(),
});
export type RestaurantAiAmbiguityOption = z.infer<typeof RestaurantAiAmbiguityOptionSchema>;

export const RestaurantAiAmbiguitySchema = z.object({
  field: z.string(),
  message: z.string(),
  options: z.array(RestaurantAiAmbiguityOptionSchema).min(1),
});
export type RestaurantAiAmbiguity = z.infer<typeof RestaurantAiAmbiguitySchema>;

export const RestaurantAiMissingModifierSchema = z.object({
  catalogItemId: z.string(),
  itemName: z.string(),
  modifierGroupId: z.string(),
  modifierGroupName: z.string(),
});
export type RestaurantAiMissingModifier = z.infer<typeof RestaurantAiMissingModifierSchema>;

export const RestaurantAiMenuSearchMatchSchema = z.object({
  catalogItemId: z.string(),
  productName: z.string(),
  sku: z.string(),
  unitPriceCents: z.number().int(),
  confidence: z.number().min(0).max(1),
  matchedText: z.string(),
});
export type RestaurantAiMenuSearchMatch = z.infer<typeof RestaurantAiMenuSearchMatchSchema>;

export const RestaurantAiOrderProposalActionSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("REPLACE_DRAFT"),
    orderId: z.string(),
    tableId: z.string(),
    discountCents: z.number().int().default(0),
    items: z.array(DraftRestaurantOrderItemInputSchema),
  }),
  z.object({
    actionType: z.literal("REQUEST_VOID"),
    request: RequestRestaurantVoidInputSchema.omit({ idempotencyKey: true }),
  }),
  z.object({
    actionType: z.literal("REQUEST_DISCOUNT"),
    request: RequestRestaurantDiscountInputSchema.omit({ idempotencyKey: true }),
  }),
  z.object({
    actionType: z.literal("TRANSFER_TABLE"),
    transfer: TransferRestaurantTableInputSchema.omit({ idempotencyKey: true }),
  }),
  z.object({
    actionType: z.literal("NOOP"),
    reason: z.string(),
  }),
]);
export type RestaurantAiOrderProposalAction = z.infer<typeof RestaurantAiOrderProposalActionSchema>;

export const RestaurantOrderProposalCardSchema = z.object({
  ok: z.literal(true),
  cardType: z.literal("restaurant.order-proposal"),
  title: z.string(),
  summary: z.string(),
  action: RestaurantAiOrderProposalActionSchema,
  ambiguities: z.array(RestaurantAiAmbiguitySchema).default([]),
  missingRequiredModifiers: z.array(RestaurantAiMissingModifierSchema).default([]),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});
export type RestaurantOrderProposalCard = z.infer<typeof RestaurantOrderProposalCardSchema>;

export const RestaurantMenuSearchCardSchema = z.object({
  ok: z.literal(true),
  cardType: z.literal("restaurant.menu-search"),
  query: z.string(),
  matches: z.array(RestaurantAiMenuSearchMatchSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});
export type RestaurantMenuSearchCard = z.infer<typeof RestaurantMenuSearchCardSchema>;

export const RestaurantFloorAttentionItemSchema = z.object({
  tableId: z.string(),
  tableName: z.string(),
  status: RestaurantTableAvailabilityStatusSchema,
  reason: z.string(),
  activeOrderId: z.string().nullable().optional(),
  activeSessionId: z.string().nullable().optional(),
});
export type RestaurantFloorAttentionItem = z.infer<typeof RestaurantFloorAttentionItemSchema>;

export const RestaurantFloorAttentionCardSchema = z.object({
  ok: z.literal(true),
  cardType: z.literal("restaurant.floor-attention"),
  summary: z.string(),
  items: z.array(RestaurantFloorAttentionItemSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});
export type RestaurantFloorAttentionCard = z.infer<typeof RestaurantFloorAttentionCardSchema>;

export const RestaurantKitchenSummaryItemSchema = z.object({
  ticketId: z.string(),
  orderId: z.string(),
  tableId: z.string(),
  stationId: z.string().nullable(),
  status: KitchenTicketStatusSchema,
  ageMinutes: z.number().int().nonnegative(),
  reason: z.string(),
});
export type RestaurantKitchenSummaryItem = z.infer<typeof RestaurantKitchenSummaryItemSchema>;

export const RestaurantKitchenSummaryCardSchema = z.object({
  ok: z.literal(true),
  cardType: z.literal("restaurant.kitchen-summary"),
  summary: z.string(),
  delayedCount: z.number().int().nonnegative(),
  items: z.array(RestaurantKitchenSummaryItemSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});
export type RestaurantKitchenSummaryCard = z.infer<typeof RestaurantKitchenSummaryCardSchema>;

export const RestaurantApprovalSummaryItemSchema = z.object({
  approvalRequestId: z.string(),
  orderId: z.string(),
  orderItemId: z.string().nullable(),
  type: RestaurantApprovalTypeSchema,
  status: RestaurantApprovalStatusSchema,
  amountCents: z.number().int().nullable(),
  reason: z.string(),
  requestedByUserId: z.string(),
  createdAt: z.string(),
});
export type RestaurantApprovalSummaryItem = z.infer<typeof RestaurantApprovalSummaryItemSchema>;

export const RestaurantApprovalSummaryCardSchema = z.object({
  ok: z.literal(true),
  cardType: z.literal("restaurant.approval-summary"),
  summary: z.string(),
  items: z.array(RestaurantApprovalSummaryItemSchema),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});
export type RestaurantApprovalSummaryCard = z.infer<typeof RestaurantApprovalSummaryCardSchema>;

export const RestaurantShiftCloseSummaryCardSchema = z.object({
  ok: z.literal(true),
  cardType: z.literal("restaurant.shift-close-summary"),
  summary: z.string(),
  metrics: z.object({
    openTables: z.number().int().nonnegative(),
    sentOrders: z.number().int().nonnegative(),
    unpaidOrders: z.number().int().nonnegative(),
    pendingApprovals: z.number().int().nonnegative(),
    expectedCashCents: z.number().int(),
    countedCashCents: z.number().int().nullable(),
    varianceCents: z.number().int().nullable(),
  }),
  anomalies: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  provenance: ProvenanceSchema,
});
export type RestaurantShiftCloseSummaryCard = z.infer<typeof RestaurantShiftCloseSummaryCardSchema>;

export const RestaurantAiToolCardSchema = z.discriminatedUnion("cardType", [
  RestaurantOrderProposalCardSchema,
  RestaurantMenuSearchCardSchema,
  RestaurantFloorAttentionCardSchema,
  RestaurantKitchenSummaryCardSchema,
  RestaurantApprovalSummaryCardSchema,
  RestaurantShiftCloseSummaryCardSchema,
]);
export type RestaurantAiToolCard = z.infer<typeof RestaurantAiToolCardSchema>;

export const RestaurantSearchMenuItemsInputSchema = z.object({
  query: z.string().min(1),
  catalogProducts: z.array(ProductSnapshotSchema).default([]),
  limit: z.number().int().positive().max(20).default(8),
});
export type RestaurantSearchMenuItemsInput = z.infer<typeof RestaurantSearchMenuItemsInputSchema>;

export const RestaurantBuildOrderDraftInputSchema = z.object({
  sourceText: z.string().min(1),
  tableId: z.string().optional(),
  orderId: z.string().optional(),
  tableSessionId: z.string().optional(),
  activeOrder: RestaurantOrderSchema.nullable().optional(),
  modifierGroups: z.array(RestaurantModifierGroupSchema).default([]),
  catalogProducts: z.array(ProductSnapshotSchema).default([]),
  floorPlanRooms: z.array(FloorPlanRoomSchema).default([]),
});
export type RestaurantBuildOrderDraftInput = z.infer<typeof RestaurantBuildOrderDraftInputSchema>;

export const RestaurantSummarizeFloorPlanAttentionInputSchema = z.object({
  rooms: z.array(FloorPlanRoomSchema).default([]),
});
export type RestaurantSummarizeFloorPlanAttentionInput = z.infer<
  typeof RestaurantSummarizeFloorPlanAttentionInputSchema
>;

export const RestaurantSummarizeKitchenDelaysInputSchema = z.object({
  tickets: z.array(KitchenTicketSchema).default([]),
  delayedThresholdMinutes: z.number().int().positive().default(15),
});
export type RestaurantSummarizeKitchenDelaysInput = z.infer<
  typeof RestaurantSummarizeKitchenDelaysInputSchema
>;

export const RestaurantDraftVoidRequestInputSchema = z.object({
  orderId: z.string(),
  orderItemId: z.string(),
  itemName: z.string().optional(),
  reason: z.string().min(1),
  sourceText: z.string().optional(),
});
export type RestaurantDraftVoidRequestInput = z.infer<typeof RestaurantDraftVoidRequestInputSchema>;

export const RestaurantDraftDiscountRequestInputSchema = z.object({
  orderId: z.string(),
  amountCents: z.number().int().positive(),
  reason: z.string().min(1),
  sourceText: z.string().optional(),
});
export type RestaurantDraftDiscountRequestInput = z.infer<
  typeof RestaurantDraftDiscountRequestInputSchema
>;

export const RestaurantSummarizeManagerApprovalsInputSchema = z.object({
  includeApplied: z.boolean().default(false),
});
export type RestaurantSummarizeManagerApprovalsInput = z.infer<
  typeof RestaurantSummarizeManagerApprovalsInputSchema
>;

export const RestaurantSummarizeShiftCloseInputSchema = z.object({
  expectedCashCents: z.number().int(),
  countedCashCents: z.number().int().nullable().optional(),
  openTables: z.number().int().nonnegative().default(0),
  sentOrders: z.number().int().nonnegative().default(0),
  unpaidOrders: z.number().int().nonnegative().default(0),
  pendingApprovals: z.number().int().nonnegative().default(0),
});
export type RestaurantSummarizeShiftCloseInput = z.infer<
  typeof RestaurantSummarizeShiftCloseInputSchema
>;
