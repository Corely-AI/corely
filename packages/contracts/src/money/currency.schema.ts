import { z } from "zod";

/**
 * Canonical currency identifier: ISO 4217 code, uppercase, 3 letters.
 * This schema validates and normalizes currency input to uppercase.
 */
export const CurrencyCodeSchema = z
  .string()
  .trim()
  .transform((val) => val.toUpperCase())
  .pipe(
    z.string().regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO 4217 code (e.g., USD, EUR)")
  );

export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/**
 * Money schema for JSON safety
 */
export const MoneySchema = z.object({
  amountMinor: z
    .string()
    .describe("Amount in minor units (e.g., cents) as string to avoid precision issues"),
  currency: CurrencyCodeSchema,
});

export type Money = z.infer<typeof MoneySchema>;
