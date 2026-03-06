import type { TaxFilingExports, TaxFilingType } from "@corely/contracts";

export type TaxFilingExportBlockReason =
  | "Tax:ExportNotSupported"
  | "Tax:FilingNotReadyForExport"
  | "Tax:JurisdictionUnsupported";

export type TaxFilingExportEligibility = {
  exports: TaxFilingExports;
  elsterXmlBlockReason?: TaxFilingExportBlockReason;
  kennzifferCsvBlockReason?: TaxFilingExportBlockReason;
  jurisdiction: string;
};

export function resolveTaxFilingExportEligibility(input: {
  filingType: TaxFilingType;
  jurisdiction?: string | null;
  lastRecalculatedAt?: string | null;
}): TaxFilingExportEligibility {
  const jurisdiction = (input.jurisdiction ?? "").trim().toUpperCase();
  const isGermany = jurisdiction === "DE";
  const isVatPeriodic = input.filingType === "vat";
  const isVatAnnual = input.filingType === "vat-annual";
  const hasRecalculatedTotals = Boolean(input.lastRecalculatedAt);

  const canExportElsterXml = isGermany && isVatPeriodic && hasRecalculatedTotals;
  const canExportKennzifferCsv = isGermany && (isVatPeriodic || isVatAnnual);

  const elsterXmlBlockReason = canExportElsterXml
    ? undefined
    : !isGermany
      ? "Tax:JurisdictionUnsupported"
      : !isVatPeriodic
        ? "Tax:ExportNotSupported"
        : "Tax:FilingNotReadyForExport";

  const kennzifferCsvBlockReason = canExportKennzifferCsv
    ? undefined
    : !isGermany
      ? "Tax:JurisdictionUnsupported"
      : "Tax:ExportNotSupported";

  return {
    exports: {
      canExportElsterXml,
      canExportKennzifferCsv,
    },
    elsterXmlBlockReason,
    kennzifferCsvBlockReason,
    jurisdiction,
  };
}
