import { z } from "zod";
import { InvoiceDtoSchema } from "./invoice.types";
import { utcInstantSchema } from "../shared/local-date.schema";

const normalizePaidAt = (value: unknown) => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }
  if (trimmed.endsWith("Z")) {
    return trimmed;
  }
  if (/[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(trimmed)) {
    return `${trimmed}Z`;
  }
  return trimmed;
};

export const RecordPaymentInputSchema = z.object({
  invoiceId: z.string(),
  amountCents: z.number().int().positive(),
  paidAt: z.preprocess(normalizePaidAt, utcInstantSchema).optional(),
  note: z.string().optional(),
});

export const RecordPaymentOutputSchema = z.object({
  invoice: InvoiceDtoSchema,
});

export type RecordPaymentInput = z.infer<typeof RecordPaymentInputSchema>;
export type RecordPaymentOutput = z.infer<typeof RecordPaymentOutputSchema>;
