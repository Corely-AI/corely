import { describe, expect, it } from "vitest";
import { resolveTaxFilingExportEligibility } from "../application/services/tax-filing-export-eligibility";

describe("resolveTaxFilingExportEligibility", () => {
  it("enables ELSTER XML + Kennziffer CSV for periodic VAT filings in DE with recalculated totals", () => {
    const eligibility = resolveTaxFilingExportEligibility({
      filingType: "vat",
      jurisdiction: "DE",
      lastRecalculatedAt: "2026-03-01T10:00:00.000Z",
    });

    expect(eligibility.exports.canExportElsterXml).toBe(true);
    expect(eligibility.exports.canExportKennzifferCsv).toBe(true);
  });

  it("disables ELSTER XML and enables Kennziffer CSV for annual VAT filings in DE", () => {
    const eligibility = resolveTaxFilingExportEligibility({
      filingType: "vat-annual",
      jurisdiction: "DE",
      lastRecalculatedAt: "2026-03-01T10:00:00.000Z",
    });

    expect(eligibility.exports.canExportElsterXml).toBe(false);
    expect(eligibility.exports.canExportKennzifferCsv).toBe(true);
    expect(eligibility.elsterXmlBlockReason).toBe("Tax:ExportNotSupported");
  });

  it("disables both exports for non-DE filings", () => {
    const eligibility = resolveTaxFilingExportEligibility({
      filingType: "vat",
      jurisdiction: "AT",
      lastRecalculatedAt: "2026-03-01T10:00:00.000Z",
    });

    expect(eligibility.exports.canExportElsterXml).toBe(false);
    expect(eligibility.exports.canExportKennzifferCsv).toBe(false);
    expect(eligibility.elsterXmlBlockReason).toBe("Tax:JurisdictionUnsupported");
    expect(eligibility.kennzifferCsvBlockReason).toBe("Tax:JurisdictionUnsupported");
  });
});
