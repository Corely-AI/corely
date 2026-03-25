import { z } from "zod";
import { PaymentMethodSchema } from "../pos/pos-sale.types";

export const RestaurantTableAvailabilityStatusSchema = z.enum([
  "AVAILABLE",
  "OCCUPIED",
  "DIRTY",
  "OUT_OF_SERVICE",
]);
export type RestaurantTableAvailabilityStatus = z.infer<
  typeof RestaurantTableAvailabilityStatusSchema
>;

export const RestaurantTableShapeSchema = z.enum(["SQUARE", "ROUND", "RECTANGLE"]);
export type RestaurantTableShape = z.infer<typeof RestaurantTableShapeSchema>;

export const RestaurantOrderStatusSchema = z.enum([
  "DRAFT",
  "PARTIALLY_SENT",
  "SENT",
  "PAID",
  "CLOSED",
  "CANCELLED",
]);
export type RestaurantOrderStatus = z.infer<typeof RestaurantOrderStatusSchema>;

export const TableSessionStatusSchema = z.enum(["OPEN", "CLOSED", "TRANSFERRED"]);
export type TableSessionStatus = z.infer<typeof TableSessionStatusSchema>;

export const ModifierSelectionModeSchema = z.enum(["SINGLE", "MULTI"]);
export type ModifierSelectionMode = z.infer<typeof ModifierSelectionModeSchema>;

export const KitchenTicketStatusSchema = z.enum(["NEW", "IN_PROGRESS", "DONE", "BUMPED"]);
export type KitchenTicketStatus = z.infer<typeof KitchenTicketStatusSchema>;

export const RestaurantApprovalTypeSchema = z.enum(["VOID", "DISCOUNT"]);
export type RestaurantApprovalType = z.infer<typeof RestaurantApprovalTypeSchema>;

export const RestaurantApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "APPLIED",
]);
export type RestaurantApprovalStatus = z.infer<typeof RestaurantApprovalStatusSchema>;

export const DiningRoomSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DiningRoom = z.infer<typeof DiningRoomSchema>;

export const RestaurantTableSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  diningRoomId: z.string(),
  name: z.string(),
  capacity: z.number().int().positive().nullable(),
  posX: z.number().int().nullable(),
  posY: z.number().int().nullable(),
  shape: RestaurantTableShapeSchema,
  availabilityStatus: RestaurantTableAvailabilityStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RestaurantTable = z.infer<typeof RestaurantTableSchema>;

export const RestaurantModifierOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceDeltaCents: z.number().int(),
  sortOrder: z.number().int().nonnegative(),
});
export type RestaurantModifierOption = z.infer<typeof RestaurantModifierOptionSchema>;

export const RestaurantModifierGroupSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  selectionMode: ModifierSelectionModeSchema,
  isRequired: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
  linkedCatalogItemIds: z.array(z.string()).default([]),
  options: z.array(RestaurantModifierOptionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RestaurantModifierGroup = z.infer<typeof RestaurantModifierGroupSchema>;

export const TableSessionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  tableId: z.string(),
  registerId: z.string().nullable(),
  shiftSessionId: z.string().nullable(),
  openedByUserId: z.string(),
  openedAt: z.string(),
  closedAt: z.string().nullable(),
  status: TableSessionStatusSchema,
  transferCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TableSession = z.infer<typeof TableSessionSchema>;

export const RestaurantOrderItemModifierSchema = z.object({
  id: z.string(),
  modifierGroupId: z.string().nullable(),
  optionName: z.string(),
  quantity: z.number().int().positive(),
  priceDeltaCents: z.number().int(),
});
export type RestaurantOrderItemModifier = z.infer<typeof RestaurantOrderItemModifierSchema>;

export const RestaurantOrderItemSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  catalogItemId: z.string(),
  itemName: z.string(),
  sku: z.string(),
  quantity: z.number().int().positive(),
  sentQuantity: z.number().int().nonnegative(),
  unitPriceCents: z.number().int(),
  taxRateBps: z.number().int().nonnegative(),
  taxCents: z.number().int(),
  lineSubtotalCents: z.number().int(),
  lineTotalCents: z.number().int(),
  voidedAt: z.string().nullable(),
  modifiers: z.array(RestaurantOrderItemModifierSchema),
});
export type RestaurantOrderItem = z.infer<typeof RestaurantOrderItemSchema>;

export const RestaurantOrderSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  tableSessionId: z.string(),
  tableId: z.string(),
  status: RestaurantOrderStatusSchema,
  subtotalCents: z.number().int(),
  discountCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
  sentAt: z.string().nullable(),
  paidAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  items: z.array(RestaurantOrderItemSchema),
  payments: z
    .array(
      z.object({
        id: z.string(),
        method: PaymentMethodSchema,
        amountCents: z.number().int().positive(),
        reference: z.string().nullable(),
      })
    )
    .default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RestaurantOrder = z.infer<typeof RestaurantOrderSchema>;

export const KitchenStationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  code: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KitchenStation = z.infer<typeof KitchenStationSchema>;

export const KitchenTicketItemSchema = z.object({
  id: z.string(),
  orderItemId: z.string(),
  itemName: z.string(),
  quantity: z.number().int().positive(),
  modifiers: z.array(RestaurantOrderItemModifierSchema),
});
export type KitchenTicketItem = z.infer<typeof KitchenTicketItemSchema>;

export const KitchenTicketSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  orderId: z.string(),
  tableSessionId: z.string(),
  tableId: z.string(),
  stationId: z.string().nullable(),
  status: KitchenTicketStatusSchema,
  sentAt: z.string(),
  updatedAt: z.string(),
  items: z.array(KitchenTicketItemSchema),
});
export type KitchenTicket = z.infer<typeof KitchenTicketSchema>;

export const RestaurantApprovalRequestSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  orderId: z.string(),
  orderItemId: z.string().nullable(),
  type: RestaurantApprovalTypeSchema,
  status: RestaurantApprovalStatusSchema,
  reason: z.string(),
  amountCents: z.number().int().nullable(),
  workflowInstanceId: z.string().nullable(),
  requestedByUserId: z.string(),
  decidedByUserId: z.string().nullable(),
  decidedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type RestaurantApprovalRequest = z.infer<typeof RestaurantApprovalRequestSchema>;

export const FloorPlanTableSchema = RestaurantTableSchema.extend({
  activeSessionId: z.string().nullable(),
  activeOrderId: z.string().nullable(),
});
export type FloorPlanTable = z.infer<typeof FloorPlanTableSchema>;

export const FloorPlanRoomSchema = DiningRoomSchema.extend({
  tables: z.array(FloorPlanTableSchema),
});
export type FloorPlanRoom = z.infer<typeof FloorPlanRoomSchema>;
