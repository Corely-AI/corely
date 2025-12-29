import { z } from "zod";
import { localDateSchema, utcInstantSchema } from "../shared/local-date.schema";

export const VendorBillStatusSchema = z.enum([
  "DRAFT",
  "APPROVED",
  "POSTED",
  "PARTIALLY_PAID",
  "PAID",
  "VOID",
]);
export type VendorBillStatus = z.infer<typeof VendorBillStatusSchema>;

export const BillPaymentMethodSchema = z.enum(["BANK_TRANSFER", "CASH", "CARD", "OTHER"]);
export type BillPaymentMethod = z.infer<typeof BillPaymentMethodSchema>;

export const VendorBillLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().positive(),
  unitCostCents: z.number().int().nonnegative(),
  category: z.string().optional(),
  glAccountId: z.string().optional(),
  taxCode: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});
export type VendorBillLineItemDto = z.infer<typeof VendorBillLineItemSchema>;

export const VendorBillTotalsSchema = z.object({
  subtotalCents: z.number().int(),
  taxCents: z.number().int(),
  totalCents: z.number().int(),
  paidCents: z.number().int(),
  dueCents: z.number().int(),
});
export type VendorBillTotalsDto = z.infer<typeof VendorBillTotalsSchema>;

export const BillPaymentSchema = z.object({
  id: z.string(),
  vendorBillId: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string(),
  paymentDate: localDateSchema,
  method: BillPaymentMethodSchema,
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  recordedAt: utcInstantSchema,
  recordedByUserId: z.string().nullable().optional(),
  journalEntryId: z.string().nullable().optional(),
});
export type BillPaymentDto = z.infer<typeof BillPaymentSchema>;

export const VendorBillDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  billNumber: z.string().nullable(),
  internalBillRef: z.string().nullable().optional(),
  status: VendorBillStatusSchema,
  supplierPartyId: z.string(),
  supplierContactPartyId: z.string().nullable().optional(),
  billDate: localDateSchema,
  dueDate: localDateSchema,
  currency: z.string(),
  paymentTerms: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  lineItems: z.array(VendorBillLineItemSchema),
  totals: VendorBillTotalsSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  approvedAt: utcInstantSchema.nullable().optional(),
  postedAt: utcInstantSchema.nullable().optional(),
  voidedAt: utcInstantSchema.nullable().optional(),
  purchaseOrderId: z.string().nullable().optional(),
  postedJournalEntryId: z.string().nullable().optional(),
  paymentJournalEntryIds: z.array(z.string()).optional(),
  payments: z.array(BillPaymentSchema).optional(),
  possibleDuplicateOfBillId: z.string().nullable().optional(),
  duplicateScore: z.number().min(0).max(1).nullable().optional(),
});
export type VendorBillDto = z.infer<typeof VendorBillDtoSchema>;
