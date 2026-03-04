import type { TaxFilingExportKind, TaxFilingType } from "@corely/contracts";

export const TAX_FILING_EXPORT_BUILDER_PORT = Symbol("TAX_FILING_EXPORT_BUILDER_PORT");

export type TaxFilingExportInput = {
  filingId: string;
  filingType: TaxFilingType;
  periodLabel: string;
  periodKey?: string;
  year?: number;
  jurisdiction: string;
  currency: string;
  vatCollectedCents: number;
  vatPaidCents: number;
  netPayableCents: number;
  salesNetCents: number;
  purchaseNetCents: number;
};

export type TaxFilingKennzifferRow = {
  kennziffer: string;
  label: string;
  value: string;
};

export type TaxFilingXmlExport = {
  kind: Extract<TaxFilingExportKind, "ELSTER_USTVA_XML">;
  xmlString: string;
  fileName: string;
  mimeType: string;
  encoding?: string;
};

export abstract class TaxFilingExportBuilderPort {
  abstract buildKennzifferMap(filing: TaxFilingExportInput): TaxFilingKennzifferRow[];
  abstract buildElsterXml(filing: TaxFilingExportInput): TaxFilingXmlExport;
}

export function buildTaxFilingExportBaseName(input: {
  filingType: TaxFilingType;
  periodLabel: string;
  periodKey?: string;
  year?: number;
}): string {
  const rawPeriod =
    input.periodKey ?? input.periodLabel ?? (input.year ? String(input.year) : "period");
  const normalizedPeriod = rawPeriod
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (input.filingType === "vat") {
    return `ustva-${normalizedPeriod || "period"}`;
  }
  if (input.filingType === "vat-annual") {
    return `ust-jahr-${normalizedPeriod || "period"}`;
  }
  return `tax-filing-${normalizedPeriod || "period"}`;
}
