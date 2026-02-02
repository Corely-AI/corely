import { z } from "zod";
import { CashEntryType, CashEntrySourceType, DailyCloseStatus } from "./constants";

// Read Models

export const CashRegisterSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  currency: z.string().default("EUR"),
  currentBalanceCents: z.number().int(),
  location: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CashRegister = z.infer<typeof CashRegisterSchema>;

export const CashEntrySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  registerId: z.string(),
  type: z.nativeEnum(CashEntryType),
  amountCents: z.number().int().positive(), // Absolute value representation often handy, or signed?
  // Prompt says "Cash Entries (cash-in / cash-out)".
  // Let's keep amount positive and use type to determine direction.
  sourceType: z.nativeEnum(CashEntrySourceType),
  description: z.string(),
  referenceId: z.string().optional().nullable(), // For linked sales/expense/reversal
  createdAt: z.string(),
  createdByUserId: z.string(),
  businessDate: z.string().optional(), // YYYY-MM-DD
});
export type CashEntry = z.infer<typeof CashEntrySchema>;

export const CashDayCloseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  registerId: z.string(),
  businessDate: z.string(), // YYYY-MM-DD
  status: z.nativeEnum(DailyCloseStatus),
  expectedBalanceCents: z.number().int(),
  countedBalanceCents: z.number().int(),
  differenceCents: z.number().int(),
  notes: z.string().optional().nullable(),
  closedAt: z.string().optional(),
  closedByUserId: z.string().optional(),
});
export type CashDayClose = z.infer<typeof CashDayCloseSchema>;

// Input DTOs

export const CreateCashRegisterSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1),
  location: z.string().optional(),
  currency: z.string().default("EUR"),
});
export type CreateCashRegister = z.infer<typeof CreateCashRegisterSchema>;

export const UpdateCashRegisterSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().optional(),
});
export type UpdateCashRegister = z.infer<typeof UpdateCashRegisterSchema>;

export const CreateCashEntrySchema = z.object({
  tenantId: z.string(),
  registerId: z.string(),
  type: z.nativeEnum(CashEntryType),
  amountCents: z.number().int().positive("Amount must be positive"),
  sourceType: z.nativeEnum(CashEntrySourceType).default(CashEntrySourceType.MANUAL),
  description: z.string().min(1, "Description is required"),
  referenceId: z.string().optional(),
  businessDate: z.string().optional(), // Optional, defaults to now/today
});
export type CreateCashEntry = z.infer<typeof CreateCashEntrySchema>;

export const ReverseCashEntrySchema = z.object({
  tenantId: z.string(),
  originalEntryId: z.string(),
  reason: z.string().min(1),
});
export type ReverseCashEntry = z.infer<typeof ReverseCashEntrySchema>;

export const SubmitDailyCloseSchema = z.object({
  tenantId: z.string(),
  registerId: z.string(),
  businessDate: z.string(), // YYYY-MM-DD
  countedBalanceCents: z.number().int(),
  notes: z.string().optional(),
});
export type SubmitDailyClose = z.infer<typeof SubmitDailyCloseSchema>;
