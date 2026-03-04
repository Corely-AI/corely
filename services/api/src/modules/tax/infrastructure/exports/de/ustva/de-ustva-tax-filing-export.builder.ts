import { Injectable } from "@nestjs/common";
import {
  buildTaxFilingExportBaseName,
  TaxFilingExportBuilderPort,
  type TaxFilingExportInput,
  type TaxFilingKennzifferRow,
  type TaxFilingXmlExport,
} from "../../../../application/ports/tax-filing-export-builder.port";
import { DE_USTVA_KENNZIFFER_MAPPING_V2026_1 } from "./de-ustva-export-mapping.v1";

@Injectable()
export class DeUstvaTaxFilingExportBuilder extends TaxFilingExportBuilderPort {
  buildKennzifferMap(filing: TaxFilingExportInput): TaxFilingKennzifferRow[] {
    if (filing.filingType !== "vat" && filing.filingType !== "vat-annual") {
      return [];
    }
    const filingType = filing.filingType;

    return DE_USTVA_KENNZIFFER_MAPPING_V2026_1.filter((entry) =>
      entry.appliesTo.includes(filingType)
    ).map((entry) => ({
      kennziffer: entry.kennziffer,
      label: entry.label,
      value: this.formatCentsAsEuro(entry.valueCents(filing)),
    }));
  }

  buildElsterXml(filing: TaxFilingExportInput): TaxFilingXmlExport {
    const rows = this.buildKennzifferMap(filing);
    const generatedAt = new Date().toISOString();
    const baseName = buildTaxFilingExportBaseName({
      filingType: filing.filingType,
      periodLabel: filing.periodLabel,
      periodKey: filing.periodKey,
      year: filing.year,
    });

    const entriesXml = rows
      .map(
        (row) =>
          `    <Field kennziffer="${this.escapeXmlAttribute(row.kennziffer)}" label="${this.escapeXmlAttribute(row.label)}">${this.escapeXmlText(row.value)}</Field>`
      )
      .join("\n");

    const xmlString = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<ElsterUStVaExport version="2026.1">',
      "  <Header>",
      `    <FilingId>${this.escapeXmlText(filing.filingId)}</FilingId>`,
      `    <Jurisdiction>${this.escapeXmlText(filing.jurisdiction)}</Jurisdiction>`,
      `    <Period>${this.escapeXmlText(filing.periodKey ?? filing.periodLabel)}</Period>`,
      `    <Currency>${this.escapeXmlText(filing.currency)}</Currency>`,
      `    <GeneratedAt>${this.escapeXmlText(generatedAt)}</GeneratedAt>`,
      "  </Header>",
      "  <UStVA>",
      entriesXml,
      "  </UStVA>",
      "</ElsterUStVaExport>",
      "",
    ].join("\n");

    return {
      kind: "ELSTER_USTVA_XML",
      xmlString,
      fileName: `${baseName}-elster.xml`,
      mimeType: "application/xml",
      encoding: "utf-8",
    };
  }

  private formatCentsAsEuro(valueCents: number): string {
    return (valueCents / 100).toFixed(2);
  }

  private escapeXmlText(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  private escapeXmlAttribute(value: string): string {
    return this.escapeXmlText(value).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
  }
}
