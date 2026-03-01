import { Injectable } from "@nestjs/common";
import archiver from "archiver";
import { PassThrough } from "node:stream";
import { once } from "node:events";
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
      "paymentMethod",
      "description",
      "amountCents",
      "currency",
      "balanceAfterCents",
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
      entry.paymentMethod,
      entry.description,
      String(entry.amountCents),
      entry.currency,
      String(entry.balanceAfterCents),
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
    const { PDFDocument, StandardFonts } = await this.loadPdfLib();
    const entries = this.sortEntries(model);
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([842, 595]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    page.drawText(`Kassenbuch - ${model.register.name}`, {
      x: 32,
      y: 560,
      size: 18,
      font,
    });
    page.drawText(`Register: ${model.register.id} | Month: ${model.month}`, {
      x: 32,
      y: 540,
      size: 10,
      font,
    });

    let y = 520;
    page.drawText("Date   No  Dir  Amount  Type  Description", {
      x: 32,
      y,
      size: 10,
      font,
    });

    y -= 14;
    for (const entry of entries.slice(0, 32)) {
      const line = `${entry.dayKey}  ${String(entry.entryNo).padStart(4, "0")}  ${entry.direction}  ${(entry.amountCents / 100).toFixed(2).padStart(9, " ")}  ${entry.type}  ${entry.description.slice(0, 40)}`;
      page.drawText(line, {
        x: 32,
        y,
        size: 9,
        font,
      });
      y -= 12;
      if (y < 60) {
        break;
      }
    }

    page.drawText("Signatures: ______________________    ______________________", {
      x: 32,
      y: 40,
      size: 10,
      font,
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

    const archive = archiver("zip", { zlib: { level: 9 } });
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
