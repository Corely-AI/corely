import { z } from "zod";
import { PurchaseOrderDtoSchema } from "./purchase-order.types";
import { PurchaseOrderLineInputSchema } from "./create-purchase-order.schema";
import { localDateSchema } from "../shared/local-date.schema";

export const PurchaseOrderHeaderPatchSchema = z.object({
  supplierPartyId: z.string().optional(),
  supplierContactPartyId: z.string().optional(),
  orderDate: localDateSchema.optional(),
  expectedDeliveryDate: localDateSchema.optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
});

export const PurchaseOrderLinePatchSchema = PurchaseOrderLineInputSchema.extend({
  id: z.string().optional(),
});

export const UpdatePurchaseOrderInputSchema = z.object({
  purchaseOrderId: z.string(),
  headerPatch: PurchaseOrderHeaderPatchSchema.optional(),
  lineItems: z.array(PurchaseOrderLinePatchSchema).optional(),
  idempotencyKey: z.string().optional(),
});

export const UpdatePurchaseOrderOutputSchema = z.object({
  purchaseOrder: PurchaseOrderDtoSchema,
});

export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderInputSchema>;
export type UpdatePurchaseOrderOutput = z.infer<typeof UpdatePurchaseOrderOutputSchema>;
