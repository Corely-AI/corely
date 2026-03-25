import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import { PaymentMethodSchema } from "../pos/pos-sale.types";
import {
  FloorPlanRoomSchema,
  KitchenTicketSchema,
  KitchenTicketStatusSchema,
  RestaurantApprovalRequestSchema,
  RestaurantOrderSchema,
  TableSessionSchema,
} from "./models";

export const GetRestaurantFloorPlanInputSchema = z.object({
  roomId: z.string().optional(),
});
export type GetRestaurantFloorPlanInput = z.infer<typeof GetRestaurantFloorPlanInputSchema>;

export const GetRestaurantFloorPlanOutputSchema = z.object({
  rooms: z.array(FloorPlanRoomSchema),
});
export type GetRestaurantFloorPlanOutput = z.infer<typeof GetRestaurantFloorPlanOutputSchema>;

export const OpenRestaurantTableInputSchema = z.object({
  tableSessionId: z.string(),
  orderId: z.string(),
  tableId: z.string(),
  registerId: z.string().optional().nullable(),
  shiftSessionId: z.string().optional().nullable(),
  openedAt: z.string().optional(),
  notes: z.string().optional().nullable(),
  idempotencyKey: z.string(),
});
export type OpenRestaurantTableInput = z.infer<typeof OpenRestaurantTableInputSchema>;

export const OpenRestaurantTableOutputSchema = z.object({
  session: TableSessionSchema,
  order: RestaurantOrderSchema,
});
export type OpenRestaurantTableOutput = z.infer<typeof OpenRestaurantTableOutputSchema>;

export const GetActiveRestaurantOrderInputSchema = z.object({
  tableId: z.string(),
});
export type GetActiveRestaurantOrderInput = z.infer<typeof GetActiveRestaurantOrderInputSchema>;

export const GetActiveRestaurantOrderOutputSchema = z.object({
  session: TableSessionSchema.nullable(),
  order: RestaurantOrderSchema.nullable(),
});
export type GetActiveRestaurantOrderOutput = z.infer<typeof GetActiveRestaurantOrderOutputSchema>;

export const DraftRestaurantOrderModifierInputSchema = z.object({
  id: z.string().optional(),
  modifierGroupId: z.string().optional().nullable(),
  optionName: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  priceDeltaCents: z.number().int().default(0),
});
export type DraftRestaurantOrderModifierInput = z.infer<
  typeof DraftRestaurantOrderModifierInputSchema
>;

export const DraftRestaurantOrderItemInputSchema = z.object({
  id: z.string().optional(),
  catalogItemId: z.string(),
  itemName: z.string().min(1),
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int(),
  taxRateBps: z.number().int().nonnegative().default(0),
  modifiers: z.array(DraftRestaurantOrderModifierInputSchema).default([]),
});
export type DraftRestaurantOrderItemInput = z.infer<typeof DraftRestaurantOrderItemInputSchema>;

export const PutRestaurantDraftOrderInputSchema = z.object({
  orderId: z.string(),
  items: z.array(DraftRestaurantOrderItemInputSchema),
  discountCents: z.number().int().default(0),
  idempotencyKey: z.string(),
});
export type PutRestaurantDraftOrderInput = z.infer<typeof PutRestaurantDraftOrderInputSchema>;

export const PutRestaurantDraftOrderOutputSchema = z.object({
  order: RestaurantOrderSchema,
});
export type PutRestaurantDraftOrderOutput = z.infer<typeof PutRestaurantDraftOrderOutputSchema>;

export const TransferRestaurantTableInputSchema = z.object({
  tableSessionId: z.string(),
  orderId: z.string(),
  toTableId: z.string(),
  idempotencyKey: z.string(),
});
export type TransferRestaurantTableInput = z.infer<typeof TransferRestaurantTableInputSchema>;

export const TransferRestaurantTableOutputSchema = z.object({
  session: TableSessionSchema,
  order: RestaurantOrderSchema,
});
export type TransferRestaurantTableOutput = z.infer<typeof TransferRestaurantTableOutputSchema>;

export const MergeRestaurantChecksInputSchema = z.object({
  targetTableSessionId: z.string(),
  targetOrderId: z.string(),
  sourceTableSessionId: z.string(),
  sourceOrderId: z.string(),
  idempotencyKey: z.string(),
});
export type MergeRestaurantChecksInput = z.infer<typeof MergeRestaurantChecksInputSchema>;

export const MergeRestaurantChecksOutputSchema = z.object({
  session: TableSessionSchema,
  order: RestaurantOrderSchema,
  sourceSessionId: z.string(),
  sourceOrderId: z.string(),
});
export type MergeRestaurantChecksOutput = z.infer<typeof MergeRestaurantChecksOutputSchema>;

export const SendRestaurantOrderToKitchenInputSchema = z.object({
  orderId: z.string(),
  idempotencyKey: z.string(),
});
export type SendRestaurantOrderToKitchenInput = z.infer<
  typeof SendRestaurantOrderToKitchenInputSchema
>;

export const SendRestaurantOrderToKitchenOutputSchema = z.object({
  order: RestaurantOrderSchema,
  tickets: z.array(KitchenTicketSchema),
});
export type SendRestaurantOrderToKitchenOutput = z.infer<
  typeof SendRestaurantOrderToKitchenOutputSchema
>;

export const ListKitchenTicketsInputSchema = ListQuerySchema.extend({
  stationId: z.string().optional(),
  status: KitchenTicketStatusSchema.optional(),
});
export type ListKitchenTicketsInput = z.infer<typeof ListKitchenTicketsInputSchema>;

export const ListKitchenTicketsOutputSchema = z.object({
  items: z.array(KitchenTicketSchema),
  pageInfo: PageInfoSchema,
});
export type ListKitchenTicketsOutput = z.infer<typeof ListKitchenTicketsOutputSchema>;

export const UpdateKitchenTicketStatusInputSchema = z.object({
  ticketId: z.string(),
  status: KitchenTicketStatusSchema,
  idempotencyKey: z.string(),
});
export type UpdateKitchenTicketStatusInput = z.infer<typeof UpdateKitchenTicketStatusInputSchema>;

export const UpdateKitchenTicketStatusOutputSchema = z.object({
  ticket: KitchenTicketSchema,
});
export type UpdateKitchenTicketStatusOutput = z.infer<typeof UpdateKitchenTicketStatusOutputSchema>;

export const RequestRestaurantVoidInputSchema = z.object({
  orderItemId: z.string(),
  reason: z.string().min(1),
  idempotencyKey: z.string(),
});
export type RequestRestaurantVoidInput = z.infer<typeof RequestRestaurantVoidInputSchema>;

export const RequestRestaurantDiscountInputSchema = z.object({
  orderId: z.string(),
  amountCents: z.number().int().positive(),
  reason: z.string().min(1),
  idempotencyKey: z.string(),
});
export type RequestRestaurantDiscountInput = z.infer<typeof RequestRestaurantDiscountInputSchema>;

export const RestaurantApprovalMutationOutputSchema = z.object({
  approvalRequest: RestaurantApprovalRequestSchema,
  order: RestaurantOrderSchema,
});
export type RestaurantApprovalMutationOutput = z.infer<
  typeof RestaurantApprovalMutationOutputSchema
>;

export const DecideRestaurantApprovalInputSchema = z.object({
  approvalRequestId: z.string(),
  comment: z.string().optional(),
  idempotencyKey: z.string(),
});
export type DecideRestaurantApprovalInput = z.infer<typeof DecideRestaurantApprovalInputSchema>;

export const RestaurantPaymentInputSchema = z.object({
  paymentId: z.string(),
  method: PaymentMethodSchema,
  amountCents: z.number().int().positive(),
  reference: z.string().nullable().optional(),
});
export type RestaurantPaymentInput = z.infer<typeof RestaurantPaymentInputSchema>;

export const CloseRestaurantTableInputSchema = z.object({
  orderId: z.string(),
  tableSessionId: z.string(),
  payments: z.array(RestaurantPaymentInputSchema).min(1),
  idempotencyKey: z.string(),
});
export type CloseRestaurantTableInput = z.infer<typeof CloseRestaurantTableInputSchema>;

export const CloseRestaurantTableOutputSchema = z.object({
  order: RestaurantOrderSchema,
  session: TableSessionSchema,
  finalizedSaleRef: z.string(),
});
export type CloseRestaurantTableOutput = z.infer<typeof CloseRestaurantTableOutputSchema>;
