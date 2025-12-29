import { z } from "zod";
import { PurchaseOrderDtoSchema } from "./purchase-order.types";
import { localDateSchema } from "../shared/local-date.schema";

export const PurchaseOrderLineInputSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative(),
  taxCode: z.string().optional(),
  category: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const CreatePurchaseOrderInputSchema = z.object({
  supplierPartyId: z.string(),
  supplierContactPartyId: z.string().optional(),
  orderDate: localDateSchema.optional(),
  expectedDeliveryDate: localDateSchema.optional(),
  currency: z.string(),
  notes: z.string().optional(),
  lineItems: z.array(PurchaseOrderLineInputSchema).min(1),
  idempotencyKey: z.string().optional(),
});

export const CreatePurchaseOrderOutputSchema = z.object({
  purchaseOrder: PurchaseOrderDtoSchema,
});

export type PurchaseOrderLineInput = z.infer<typeof PurchaseOrderLineInputSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderInputSchema>;
export type CreatePurchaseOrderOutput = z.infer<typeof CreatePurchaseOrderOutputSchema>;
