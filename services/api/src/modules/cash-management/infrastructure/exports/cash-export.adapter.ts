import { Injectable } from "@nestjs/common";
import { PassThrough } from "node:stream";
import { once } from "node:events";
import type Archiver from "archiver";
import type * as PdfLib from "pdf-lib";
import {
  type CashExportPayload,
  type ExportModel,
  type ExportPort,
} from "../../application/ports/cash-management.ports";

const csvEscape = (value: string): string => {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const toCsv = (headers: string[], rows: string[][]): string => {
  const all = [headers, ...rows];
  return all.map((row) => row.map(csvEscape).join(",")).join("\n");
};

@Injectable()
export class CashExportAdapter implements ExportPort {
  private truncatePdfText(
    font: PdfLib.PDFFont,
    size: number,
    value: string,
    maxWidth: number
  ): string {
    if (font.widthOfTextAtSize(value, size) <= maxWidth) {
      return value;
    }

    const ellipsis = "...";
    let truncated = value;
    while (truncated.length > 0) {
      const candidate = `${truncated}${ellipsis}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        return candidate;
      }
      truncated = truncated.slice(0, -1);
    }

    return ellipsis;
  }

  async generate(model: ExportModel): Promise<CashExportPayload> {
    switch (model.format) {
      case "CSV":
        return this.buildCsv(model);
      case "PDF":
        return this.buildPdf(model);
      case "DATEV":
        return this.buildDatev(model);
      case "AUDIT_PACK":
        return this.buildAuditPack(model);
      default:
        return this.buildCsv(model);
    }
  }

  private sortEntries(model: ExportModel) {
    return [...model.entries].sort((a, b) => {
      if (a.occurredAt.getTime() !== b.occurredAt.getTime()) {
        return a.occurredAt.getTime() - b.occurredAt.getTime();
      }
      return a.entryNo - b.entryNo;
    });
  }

  private buildCsv(model: ExportModel): CashExportPayload {
    const entries = this.sortEntries(model);
    const headers = [
      "dayKey",
      "occurredAt",
      "entryNo",
      "direction",
      "type",
      "source",
      "description",
      "grossAmountCents",
      "netAmountCents",
      "taxAmountCents",
      "taxMode",
      "taxCode",
      "taxRateBps",
      "currency",
      "balanceAfterCents",
      "sourceDocumentRef",
      "referenceId",
      "reversalOfEntryId",
      "reversedByEntryId",
    ];

    const rows = entries.map((entry) => [
      entry.dayKey,
      entry.occurredAt.toISOString(),
      String(entry.entryNo),
      entry.direction,
      entry.type,
      entry.source,
      entry.description,
      String(entry.grossAmountCents),
      String(entry.netAmountCents ?? entry.grossAmountCents),
      String(entry.taxAmountCents ?? 0),
      entry.taxMode ?? "",
      entry.taxCode ?? "",
      entry.taxRateBps !== null ? String(entry.taxRateBps) : "",
      entry.currency,
      String(entry.balanceAfterCents),
      entry.sourceDocumentRef ?? "",
      entry.referenceId ?? "",
      entry.reversalOfEntryId ?? "",
      entry.reversedByEntryId ?? "",
    ]);

    const csv = toCsv(headers, rows);
    return {
      fileName: `cashbook-${model.register.id}-${model.month}.csv`,
      contentType: "text/csv; charset=utf-8",
      data: Buffer.from(csv, "utf-8"),
    };
  }

  private buildDatev(model: ExportModel): CashExportPayload {
    const entries = this.sortEntries(model);

    // NOTE: This is a deliberately minimal EXTF-compatible subset.
    // Fields are limited to a stable schema for bookkeeping handoff, not full DATEV accounting coverage.
    const headers = [
      "Umsatz (ohne Soll/Haben-Kz)",
      "Soll/Haben-Kennzeichen",
      "Buchungsschluessel",
      "Belegdatum",
      "Belegfeld 1",
      "Buchungstext",
      "WKZ Umsatz",
      "Konto",
      "Gegenkonto",
    ];

    const rows = entries.map((entry) => [
      (entry.amountCents / 100).toFixed(2),
      entry.direction === "IN" ? "S" : "H",
      "0",
      entry.dayKey.replace(/-/g, ""),
      String(entry.entryNo),
      entry.description,
      entry.currency,
      entry.direction === "IN" ? "1000" : "6999",
      entry.direction === "IN" ? "8400" : "1000",
    ]);

    const csv = toCsv(headers, rows);
    return {
      fileName: `datev-extf-${model.register.id}-${model.month}.csv`,
      contentType: "text/csv; charset=utf-8",
      data: Buffer.from(csv, "utf-8"),
    };
  }

  private async buildPdf(model: ExportModel): Promise<CashExportPayload> {
    const { PDFDocument, StandardFonts, rgb } = await this.loadPdfLib();
    const entries = this.sortEntries(model);
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const borderColor = rgb(0.84, 0.84, 0.84);
    const headerFill = rgb(0.97, 0.97, 0.97);
    const titleColor = rgb(0.08, 0.08, 0.08);
    const bodyColor = rgb(0.14, 0.14, 0.14);
    const tableLeft = 32;
    const tableWidth = 778;
    const tableTop = 500;
    const tableBottom = 82;
    const headerHeight = 24;
    const rowHeight = 22;
    const cellPaddingX = 6;
    const bodyFontSize = 9;
    const columns = [
      { label: "Date", key: "date", width: 82, align: "left" },
      { label: "No", key: "no", width: 44, align: "left" },
      { label: "Dir", key: "dir", width: 38, align: "left" },
      { label: "Gross", key: "gross", width: 74, align: "right" },
      { label: "VAT", key: "vat", width: 60, align: "right" },
      { label: "Type", key: "type", width: 124, align: "left" },
      { label: "Description", key: "description", width: 356, align: "left" },
    ] as const;
    const maxRows = Math.floor((tableTop - tableBottom - headerHeight) / rowHeight);
    const visibleEntries = entries.slice(0, maxRows);

    page.drawText(`Kassenbuch - ${model.register.name}`, {
      x: 32,
      y: 560,
      size: 18,
      font: boldFont,
      color: titleColor,
    });
    page.drawText(`Register: ${model.register.id} | Month: ${model.month}`, {
      x: 32,
      y: 540,
      size: 10,
      font,
      color: bodyColor,
    });

    page.drawRectangle({
      x: tableLeft,
      y: tableTop - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: headerFill,
    });

    let x = tableLeft;
    for (const column of columns) {
      const text = this.truncatePdfText(
        boldFont,
        bodyFontSize,
        column.label,
        column.width - cellPaddingX * 2
      );
      const textWidth = boldFont.widthOfTextAtSize(text, bodyFontSize);
      const textX =
        column.align === "right" ? x + column.width - cellPaddingX - textWidth : x + cellPaddingX;

      page.drawText(text, {
        x: textX,
        y: tableTop - 16,
        size: bodyFontSize,
        font: boldFont,
        color: titleColor,
      });
      x += column.width;
    }

    for (let rowIndex = 0; rowIndex < visibleEntries.length; rowIndex += 1) {
      const entry = visibleEntries[rowIndex];
      const rowTop = tableTop - headerHeight - rowIndex * rowHeight;
      const rowBottom = rowTop - rowHeight;
      const rowValues = [
        entry.dayKey,
        String(entry.entryNo).padStart(4, "0"),
        entry.direction,
        (entry.grossAmountCents / 100).toFixed(2),
        ((entry.taxAmountCents ?? 0) / 100).toFixed(2),
        entry.type,
        entry.description,
      ];

      let columnX = tableLeft;
      columns.forEach((column, columnIndex) => {
        const rawValue = rowValues[columnIndex] ?? "";
        const text = this.truncatePdfText(
          font,
          bodyFontSize,
          rawValue,
          column.width - cellPaddingX * 2
        );
        const textWidth = font.widthOfTextAtSize(text, bodyFontSize);
        const textX =
          column.align === "right"
            ? columnX + column.width - cellPaddingX - textWidth
            : columnX + cellPaddingX;

        page.drawText(text, {
          x: textX,
          y: rowBottom + 7,
          size: bodyFontSize,
          font,
          color: bodyColor,
        });
        columnX += column.width;
      });
    }

    let gridX = tableLeft;
    const tableHeight = headerHeight + visibleEntries.length * rowHeight;
    for (const column of [...columns, { width: 0 }]) {
      page.drawLine({
        start: { x: gridX, y: tableTop },
        end: { x: gridX, y: tableTop - tableHeight },
        thickness: 0.5,
        color: borderColor,
      });
      gridX += column.width;
    }

    const horizontalLines = [
      tableTop,
      tableTop - headerHeight,
      ...visibleEntries.map((_, index) => tableTop - headerHeight - (index + 1) * rowHeight),
    ];
    for (const lineY of horizontalLines) {
      page.drawLine({
        start: { x: tableLeft, y: lineY },
        end: { x: tableLeft + tableWidth, y: lineY },
        thickness: 0.5,
        color: borderColor,
      });
    }

    page.drawText("Signatures: ______________________    ______________________", {
      x: 32,
      y: 40,
      size: 10,
      font,
      color: bodyColor,
    });

    const data = await pdf.save();
    return {
      fileName: `cashbook-${model.register.id}-${model.month}.pdf`,
      contentType: "application/pdf",
      data: Buffer.from(data),
    };
  }

  private async loadPdfLib(): Promise<typeof PdfLib> {
    try {
      return await import("pdf-lib");
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`PDF export is unavailable because pdf-lib is not installed: ${reason}`);
    }
  }

  private async buildAuditPack(model: ExportModel): Promise<CashExportPayload> {
    const csvBook = this.buildCsv(model).data;
    const csvDayCloses = this.buildDayCloseCsv(model);
    const csvAttachments = this.buildAttachmentCsv(model);
    const csvAudit = this.buildAuditCsv(model);
    const createArchiver = await this.loadArchiver();

    const manifest = {
      registerId: model.register.id,
      registerName: model.register.name,
      month: model.month,
      generatedAt: new Date().toISOString(),
      files: ["cashbook.csv", "day-closes.csv", "attachments.csv", "audit-log.csv"],
    };

    const output = new PassThrough();
    const chunks: Buffer[] = [];
    output.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    const archive = createArchiver("zip", { zlib: { level: 9 } });
    archive.pipe(output);

    archive.append(csvBook, { name: "cashbook.csv" });
    archive.append(csvDayCloses, { name: "day-closes.csv" });
    archive.append(csvAttachments, { name: "attachments.csv" });
    archive.append(csvAudit, { name: "audit-log.csv" });
    archive.append(Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"), {
      name: "manifest.json",
    });

    const outputEnded = once(output, "end");
    await archive.finalize();
    await outputEnded;

    const data = Buffer.concat(chunks);

    return {
      fileName: `cash-audit-pack-${model.register.id}-${model.month}.zip`,
      contentType: "application/zip",
      data,
    };
  }

  private async loadArchiver(): Promise<typeof Archiver> {
    try {
      const mod = await import("archiver");
      return mod.default;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Audit pack export is unavailable because archiver is not installed: ${reason}`
      );
    }
  }

  private buildDayCloseCsv(model: ExportModel): Buffer {
    const headers = [
      "dayKey",
      "status",
      "expectedBalanceCents",
      "countedBalanceCents",
      "differenceCents",
      "submittedAt",
      "submittedByUserId",
      "note",
    ];

    const rows = model.dayCloses.map((close) => [
      close.dayKey,
      close.status,
      String(close.expectedBalanceCents),
      String(close.countedBalanceCents),
      String(close.differenceCents),
      close.submittedAt?.toISOString() ?? "",
      close.submittedByUserId ?? "",
      close.note ?? "",
    ]);

    return Buffer.from(toCsv(headers, rows), "utf-8");
  }

  private buildAttachmentCsv(model: ExportModel): Buffer {
    const headers = ["entryId", "documentId", "uploadedByUserId", "createdAt"];
    const rows = model.attachments.map((row) => [
      row.entryId,
      row.documentId,
      row.uploadedByUserId ?? "",
      row.createdAt.toISOString(),
    ]);

    return Buffer.from(toCsv(headers, rows), "utf-8");
  }

  private buildAuditCsv(model: ExportModel): Buffer {
    const headers = ["createdAt", "action", "entity", "entityId", "actorUserId", "details"];
    const rows = model.auditRows.map((row) => [
      row.createdAt.toISOString(),
      row.action,
      row.entity,
      row.entityId,
      row.actorUserId ?? "",
      row.details ?? "",
    ]);

    return Buffer.from(toCsv(headers, rows), "utf-8");
  }
}
