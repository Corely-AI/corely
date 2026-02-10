import { z } from "zod";

/**
 * Input for generating a monthly pack report
 */
export const GetMonthlyPackInputSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  currency: z.string().default("EUR"),
});

export type GetMonthlyPackInput = z.infer<typeof GetMonthlyPackInputSchema>;

/**
 * P&L Summary section
 */
export const PLSummarySchema = z.object({
  revenueCents: z.number().int(),
  cogsCents: z.number().int(),
  grossMarginCents: z.number().int(),
  grossMarginPercent: z.number(),
});

export type PLSummary = z.infer<typeof PLSummarySchema>;

/**
 * VAT Summary section
 */
export const VATSummarySchema = z.object({
  inputVatCents: z.number().int(),
  outputVatCents: z.number().int(),
  netVatPayableCents: z.number().int(),
});

export type VATSummary = z.infer<typeof VATSummarySchema>;

/**
 * Excise Summary section
 */
export const ExciseSummarySchema = z.object({
  totalExciseCents: z.number().int(),
  byProduct: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      exciseCents: z.number().int(),
    })
  ),
});

export type ExciseSummary = z.infer<typeof ExciseSummarySchema>;

/**
 * Inventory Balance section
 */
export const InventoryBalanceSchema = z.object({
  totalValueCents: z.number().int(),
  totalQuantity: z.number(),
  byProduct: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      quantity: z.number(),
      valueCents: z.number().int(),
    })
  ),
});

export type InventoryBalance = z.infer<typeof InventoryBalanceSchema>;

/**
 * Expiry Alerts section
 */
export const ExpiryAlertsSchema = z.object({
  expiring30Days: z.number().int(),
  expiring60Days: z.number().int(),
  expiring90Days: z.number().int(),
  expired: z.number().int(),
  items: z.array(
    z.object({
      lotId: z.string(),
      lotNumber: z.string(),
      productId: z.string(),
      productName: z.string(),
      quantity: z.number(),
      expiryDate: z.string().nullable(),
      daysUntilExpiry: z.number().nullable(),
    })
  ),
});

export type ExpiryAlerts = z.infer<typeof ExpiryAlertsSchema>;

/**
 * Import Activity section
 */
export const ImportActivitySchema = z.object({
  shipmentsReceived: z.number().int(),
  totalLandedCostCents: z.number().int(),
  totalDutiesCents: z.number().int(),
  totalExciseCents: z.number().int(),
  shipments: z.array(
    z.object({
      shipmentId: z.string(),
      shipmentNumber: z.string().nullable(),
      supplierName: z.string().nullable(),
      receivedDate: z.string().nullable(),
      landedCostCents: z.number().int(),
    })
  ),
});

export type ImportActivity = z.infer<typeof ImportActivitySchema>;

/**
 * Complete Monthly Pack Report
 */
export const MonthlyPackReportSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  currency: z.string(),
  generatedAt: z.string().datetime(),
  plSummary: PLSummarySchema,
  vatSummary: VATSummarySchema,
  exciseSummary: ExciseSummarySchema,
  inventoryBalance: InventoryBalanceSchema,
  expiryAlerts: ExpiryAlertsSchema,
  importActivity: ImportActivitySchema,
});

export type MonthlyPackReport = z.infer<typeof MonthlyPackReportSchema>;

/**
 * Output for monthly pack endpoint
 */
export const GetMonthlyPackOutputSchema = z.object({
  report: MonthlyPackReportSchema,
});

export type GetMonthlyPackOutput = z.infer<typeof GetMonthlyPackOutputSchema>;
