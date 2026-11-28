import { z } from "zod";
import { OpenBukBookSchema } from "./openbuk.schema";

const sourceId = z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/);
const sourceInstant = z.string().datetime({ offset: true });
const mapping = z.record(sourceId, sourceId);
const fingerprint = z.string().regex(/^[a-f0-9]{64}$/);
const currency = z.string().regex(/^[A-Z]{3}$/);

const confirmedRowSchema = z
  .object({
    sourceId,
    status: z.literal("CONFIRMED"),
    sourceServiceId: sourceId,
    sourceStaffId: sourceId,
    startAt: sourceInstant,
    endAt: sourceInstant,
    priceCents: z.number().int().nonnegative(),
    currency,
    customer: OpenBukBookSchema.shape.customer,
  })
  .strict();

export const OpenBukImportRowSchema = z.discriminatedUnion("status", [
  confirmedRowSchema,
  z.object({ sourceId, status: z.literal("CANCELLED") }).strict(),
]);

export const OpenBukImportInputSchema = z
  .object({
    source: sourceId,
    exportedAt: sourceInstant.refine((value) => Number.isFinite(Date.parse(value))),
    exportHash: fingerprint,
    timezone: z.string().trim().min(1).max(100),
    services: mapping,
    staff: mapping,
    rows: z.array(z.unknown()).min(1).max(20),
  })
  .strict();

export const OpenBukImportApplySchema = z
  .object({
    batch: OpenBukImportInputSchema,
    preview: fingerprint,
    sourceWritesFrozen: z.literal(true),
  })
  .strict();

export type OpenBukImportInput = z.infer<typeof OpenBukImportInputSchema>;
export type OpenBukImportConfirmedRow = z.infer<typeof confirmedRowSchema>;

export const OpenBukImportErrorSchema = z.enum([
  "INVALID_ROW",
  "DUPLICATE_SOURCE",
  "CHANGED_SOURCE",
  "MISSING_MAPPING",
  "TIMEZONE_MISMATCH",
  "CURRENCY_MISMATCH",
  "SLOT_UNAVAILABLE",
  "BATCH_OVERLAP",
]);

export type OpenBukImportError = z.infer<typeof OpenBukImportErrorSchema>;

const row = z.object({ index: z.number().int().nonnegative(), sourceId: sourceId.nullable() });
export const OpenBukImportResultSchema = z
  .object({
    preview: fingerprint,
    applied: z.boolean(),
    exportedAt: sourceInstant,
    exportHash: fingerprint,
    rows: z.array(
      z.discriminatedUnion("status", [
        row.extend({
          status: z.literal("READY"),
          appointment: z
            .object({
              sourceServiceId: sourceId,
              sourceStaffId: sourceId,
              serviceId: sourceId,
              staffId: sourceId,
              startAt: sourceInstant,
              endAt: sourceInstant,
              timezone: z.string(),
              priceCents: z.number().int().nonnegative(),
              currency,
            })
            .strict(),
        }),
        row.extend({ status: z.literal("CANCELLED") }),
        row.extend({ status: z.literal("IMPORTED"), bookingId: z.string().nullable() }),
        row.extend({ status: z.literal("ERROR"), error: OpenBukImportErrorSchema }),
      ])
    ),
  })
  .strict();

export type OpenBukImportResult = z.infer<typeof OpenBukImportResultSchema>;
