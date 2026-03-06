import { z } from "zod";

export const TaxFilingExportKindSchema = z.enum(["ELSTER_USTVA_XML", "USTVA_KENNZIFFER_CSV"]);
export type TaxFilingExportKind = z.infer<typeof TaxFilingExportKindSchema>;

export const TaxFilingExportsSchema = z.object({
  canExportElsterXml: z.boolean(),
  canExportKennzifferCsv: z.boolean(),
});
export type TaxFilingExports = z.infer<typeof TaxFilingExportsSchema>;

export const TaxFilingExportErrorCodeSchema = z.enum([
  "Tax:ExportNotSupported",
  "Tax:FilingNotReadyForExport",
  "Tax:JurisdictionUnsupported",
  "Tax:Forbidden",
]);
export type TaxFilingExportErrorCode = z.infer<typeof TaxFilingExportErrorCodeSchema>;
