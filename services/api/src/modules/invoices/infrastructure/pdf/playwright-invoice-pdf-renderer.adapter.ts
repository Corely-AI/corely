import { Injectable, Logger } from "@nestjs/common";
import type { Browser } from "playwright";
import type {
  InvoicePdfRendererPort,
  InvoicePdfModel,
} from "../../application/ports/invoice-pdf-renderer.port";

@Injectable()
export class PlaywrightInvoicePdfRendererAdapter implements InvoicePdfRendererPort {
  private readonly logger = new Logger(PlaywrightInvoicePdfRendererAdapter.name);

  constructor(private readonly browser: Browser) {}

  async renderInvoiceToPdf(args: {
    tenantId: string;
    invoiceId: string;
    model: InvoicePdfModel;
  }): Promise<Buffer> {
    const { tenantId, invoiceId, model } = args;
    this.logger.log(`Generating PDF for invoice ${invoiceId} (tenant: ${tenantId})`);

    const html = this.generateHtml(model);
    const page = await this.browser.newPage();

    try {
      await page.setContent(html, { waitUntil: "networkidle" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
        printBackground: true,
      });

      this.logger.log(
        `PDF generated successfully for invoice ${invoiceId} (size: ${pdfBuffer.length} bytes)`
      );
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate PDF for invoice ${invoiceId}`, error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      await page.close();
    }
  }

  private generateHtml(model: InvoicePdfModel): string {
    const itemsHtml = model.items
      .map(
        (item) => `
        <tr>
          <td>${this.escapeHtml(item.description)}</td>
          <td style="text-align: right;">${this.escapeHtml(item.qty)}</td>
          <td style="text-align: right;">${this.escapeHtml(item.unitPrice)}</td>
          <td style="text-align: right;">${this.escapeHtml(item.lineTotal)}</td>
        </tr>
      `
      )
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
    }
    .container {
      padding: 20mm 15mm;
    }
    .header {
      margin-bottom: 30px;
    }
    .invoice-title {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .invoice-number {
      font-size: 12pt;
      color: #666;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 8px;
      color: #444;
    }
    .bill-to {
      line-height: 1.6;
    }
    .dates {
      display: flex;
      gap: 30px;
      margin-bottom: 25px;
    }
    .date-item {
      flex: 1;
    }
    .date-label {
      font-weight: bold;
      font-size: 9pt;
      color: #666;
      margin-bottom: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    thead {
      display: table-header-group;
    }
    thead th {
      background-color: #f5f5f5;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      border-bottom: 2px solid #333;
    }
    tbody td {
      padding: 8px 10px;
      border-bottom: 1px solid #e0e0e0;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .totals {
      margin-top: 30px;
      margin-left: auto;
      width: 250px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.grand {
      font-weight: bold;
      font-size: 12pt;
      border-top: 2px solid #333;
      margin-top: 8px;
      padding-top: 12px;
    }
    .notes {
      margin-top: 40px;
      padding: 15px;
      background-color: #f9f9f9;
      border-left: 3px solid #ccc;
    }
    .notes-title {
      font-weight: bold;
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-number">#${this.escapeHtml(model.invoiceNumber)}</div>
    </div>

    <div class="section">
      <div class="section-title">Bill To</div>
      <div class="bill-to">
        <div><strong>${this.escapeHtml(model.billToName)}</strong></div>
        ${model.billToAddress ? `<div>${this.escapeHtml(model.billToAddress)}</div>` : ""}
      </div>
    </div>

    <div class="dates">
      <div class="date-item">
        <div class="date-label">Issue Date</div>
        <div>${this.escapeHtml(model.issueDate)}</div>
      </div>
      ${
        model.dueDate
          ? `
      <div class="date-item">
        <div class="date-label">Due Date</div>
        <div>${this.escapeHtml(model.dueDate)}</div>
      </div>
      `
          : ""
      }
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: right;">Quantity</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${this.escapeHtml(model.totals.subtotal)}</span>
      </div>
      <div class="total-row grand">
        <span>Total:</span>
        <span>${this.escapeHtml(model.totals.total)}</span>
      </div>
    </div>

    ${
      model.notes
        ? `
    <div class="notes">
      <div class="notes-title">Notes</div>
      <div>${this.escapeHtml(model.notes)}</div>
    </div>
    `
        : ""
    }
  </div>
</body>
</html>
    `.trim();
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
