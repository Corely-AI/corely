import type { TaxFilingDetail, TaxFilingType } from "@corely/contracts";
import type { TaxFilingExportInput } from "../ports/tax-filing-export-builder.port";

export type TaxFilingBinaryExportResult = {
  kind: "ELSTER_USTVA_XML" | "USTVA_KENNZIFFER_CSV";
  content: string;
  fileName: string;
  mimeType: string;
  encoding?: string;
};

export function buildTaxFilingExportInput(
  filing: TaxFilingDetail,
  jurisdiction: string
): TaxFilingExportInput {
  return {
    filingId: filing.id,
    filingType: filing.type,
    periodLabel: filing.periodLabel,
    periodKey: filing.periodKey,
    year: filing.year,
    jurisdiction,
    currency: filing.totals?.currency ?? "EUR",
    vatCollectedCents: filing.totals?.vatCollectedCents ?? 0,
    vatPaidCents: filing.totals?.vatPaidCents ?? 0,
    netPayableCents: filing.totals?.netPayableCents ?? 0,
    salesNetCents: filing.totals?.salesNetCents ?? 0,
    purchaseNetCents: filing.totals?.purchaseNetCents ?? 0,
  };
}

export function isSupportedCsvFilingType(type: TaxFilingType): boolean {
  return type === "vat" || type === "vat-annual";
}
