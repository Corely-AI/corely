import type { TaxFilingExportInput } from "../../../../application/ports/tax-filing-export-builder.port";

type DeUstvaSupportedFilingType = "vat" | "vat-annual";

export type DeUstvaKennzifferMappingRow = {
  kennziffer: string;
  label: string;
  appliesTo: readonly DeUstvaSupportedFilingType[];
  valueCents: (filing: TaxFilingExportInput) => number;
};

// Centralized DE UStVA mapping (v2026.1). Keep all Kennziffer definitions in this table.
export const DE_USTVA_KENNZIFFER_MAPPING_V2026_1: readonly DeUstvaKennzifferMappingRow[] = [
  {
    kennziffer: "81",
    label: "Steuerpflichtige Umsaetze (netto)",
    appliesTo: ["vat"],
    valueCents: (filing) => filing.salesNetCents,
  },
  {
    kennziffer: "66",
    label: "Umsatzsteuer",
    appliesTo: ["vat", "vat-annual"],
    valueCents: (filing) => filing.vatCollectedCents,
  },
  {
    kennziffer: "67",
    label: "Abziehbare Vorsteuer",
    appliesTo: ["vat", "vat-annual"],
    valueCents: (filing) => filing.vatPaidCents,
  },
  {
    kennziffer: "83",
    label: "Verbleibende Umsatzsteuer",
    appliesTo: ["vat", "vat-annual"],
    valueCents: (filing) => Math.max(filing.netPayableCents, 0),
  },
  {
    kennziffer: "84",
    label: "Vorsteuer-Ueberschuss",
    appliesTo: ["vat", "vat-annual"],
    valueCents: (filing) => Math.max(filing.netPayableCents * -1, 0),
  },
] as const;
