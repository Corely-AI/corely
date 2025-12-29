import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const PurchaseOrderStatusSchema = z.enum([
  "DRAFT",
  "APPROVED",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CLOSED",
  "CANCELED",
]);
export type PurchaseOrderStatus = z.infer<typeof PurchaseOrderStatusSchema>;

export const PurchaseOrderLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative(),
  taxCode: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type PurchaseOrderLineItemDto = z.infer<typeof PurchaseOrderLineItemSchema>;

export const PurchaseOrderTotalsSchema = z.object({
  subtotalCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
});
export type PurchaseOrderTotalsDto = z.infer<typeof PurchaseOrderTotalsSchema>;

export const PurchaseOrderDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  poNumber: z.string().nullable(),
  status: PurchaseOrderStatusSchema,
  supplierPartyId: z.string(),
  supplierContactPartyId: z.string().nullable().optional(),
  orderDate: localDateSchema.nullable().optional(),
  expectedDeliveryDate: localDateSchema.nullable().optional(),
  currency: z.string(),
  notes: z.string().nullable().optional(),
  lineItems: z.array(PurchaseOrderLineItemSchema),
  totals: PurchaseOrderTotalsSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  approvedAt: utcInstantSchema.nullable().optional(),
  sentAt: utcInstantSchema.nullable().optional(),
  receivedAt: utcInstantSchema.nullable().optional(),
  closedAt: utcInstantSchema.nullable().optional(),
  linkedBillIds: z.array(z.string()).optional(),
});
export type PurchaseOrderDto = z.infer<typeof PurchaseOrderDtoSchema>;
