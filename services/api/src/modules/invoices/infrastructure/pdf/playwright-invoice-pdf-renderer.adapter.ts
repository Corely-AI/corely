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

    const billFromLine =
      model.billFromName || model.billFromAddress
        ? `${model.billFromName ? this.escapeHtml(model.billFromName) : ""}${
            model.billFromName && model.billFromAddress ? " | " : ""
          }${model.billFromAddress ? this.escapeHtml(model.billFromAddress) : ""}`
        : "";

    const billToLines = model.billToAddress
      ? model.billToAddress.split(", ").map((line) => this.escapeHtml(line))
      : [];

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
      color: #2b2b2b;
    }
    .container {
      padding: 20mm 15mm;
    }
    .company-line {
      font-size: 9.5pt;
      color: #444;
      letter-spacing: 0.2px;
      margin-bottom: 28px;
    }
    .header {
      margin-bottom: 30px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-weight: 600;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 6px;
      color: #8a8a8a;
    }
    .bill-to {
      line-height: 1.6;
    }
    .dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px 40px;
      margin-top: 6px;
    }
    .date-item {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 16px;
    }
    .date-label {
      font-weight: 600;
      font-size: 9pt;
      color: #8a8a8a;
    }
    .date-value {
      font-size: 10.5pt;
      color: #2b2b2b;
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
      padding: 8px 10px 10px;
      text-align: left;
      font-weight: 600;
      color: #8a8a8a;
      text-transform: uppercase;
      font-size: 9pt;
      border-bottom: 1px solid #33b6c4;
    }
    tbody td {
      padding: 8px 10px;
      border-bottom: 1px solid #eaeaea;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .totals {
      margin-top: 40px;
      margin-left: auto;
      width: 280px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 10.5pt;
    }
    .total-row.grand {
      font-weight: bold;
      font-size: 11.5pt;
      border-top: 1px solid #c9c9c9;
      margin-top: 8px;
      padding-top: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    ${billFromLine ? `<div class="company-line">${billFromLine}</div>` : ""}

    <div class="section">
      <div class="dates">
        <div>
          <div class="section-title">Billed to</div>
          <div class="bill-to">
            <div><strong>${this.escapeHtml(model.billToName)}</strong></div>
            ${billToLines.map((line) => `<div>${line}</div>`).join("")}
          </div>
        </div>
        <div>
          <div class="date-item">
            <div class="date-label">Invoice date</div>
            <div class="date-value">${this.escapeHtml(model.issueDate)}</div>
          </div>
          ${
            model.serviceDate
              ? `
          <div class="date-item">
            <div class="date-label">Service date</div>
            <div class="date-value">${this.escapeHtml(model.serviceDate)}</div>
          </div>
          `
              : ""
          }
          <div class="date-item">
            <div class="date-label">Invoice number</div>
            <div class="date-value">${this.escapeHtml(model.invoiceNumber)}</div>
          </div>
          ${
            model.dueDate
              ? `
          <div class="date-item">
            <div class="date-label">Due date</div>
            <div class="date-value">${this.escapeHtml(model.dueDate)}</div>
          </div>
          `
              : ""
          }
        </div>
      </div>
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
        <span>Total amount (Net)</span>
        <span>${this.escapeHtml(model.totals.subtotal)}</span>
      </div>
      ${
        model.totals.vatAmount
          ? `
      <div class="total-row">
        <span>VAT ${this.escapeHtml(model.totals.vatRate || "")}</span>
        <span>${this.escapeHtml(model.totals.vatAmount)}</span>
      </div>
      `
          : ""
      }
      <div class="total-row grand">
        <span>Total amount (Gross)</span>
        <span>${this.escapeHtml(model.totals.total)}</span>
      </div>
    </div>

    ${
      model.paymentSnapshot
        ? `
    <div class="section">
      <div class="section-title">Payment Details</div>
      <div style="font-size: 10pt; line-height: 1.6;">
        ${
          model.paymentSnapshot.type === "BANK_TRANSFER"
            ? `
          <div><strong>Bank Transfer</strong></div>
          ${model.paymentSnapshot.accountHolderName ? `<div>${this.escapeHtml(model.paymentSnapshot.accountHolderName)}</div>` : ""}
          ${model.paymentSnapshot.iban ? `<div>IBAN: ${this.escapeHtml(model.paymentSnapshot.iban)}</div>` : ""}
          ${model.paymentSnapshot.bic ? `<div>BIC: ${this.escapeHtml(model.paymentSnapshot.bic)}</div>` : ""}
          ${model.paymentSnapshot.bankName ? `<div>Bank: ${this.escapeHtml(model.paymentSnapshot.bankName)}</div>` : ""}
          <div style="margin-top: 8px;">Reference: <strong>${this.escapeHtml(model.paymentSnapshot.referenceText)}</strong></div>
        `
            : `
          <div><strong>${this.escapeHtml(model.paymentSnapshot.label)}</strong></div>
          ${model.paymentSnapshot.instructions ? `<div>${this.escapeHtml(model.paymentSnapshot.instructions)}</div>` : ""}
          ${model.paymentSnapshot.payUrl ? `<div>URL: ${this.escapeHtml(model.paymentSnapshot.payUrl)}</div>` : ""}
          ${model.paymentSnapshot.referenceText ? `<div style="margin-top: 8px;">Reference: <strong>${this.escapeHtml(model.paymentSnapshot.referenceText)}</strong></div>` : ""}
        `
        }
      </div>
    </div>
    `
        : ""
    }

    ${
      model.notes
        ? `
    <div class="section">
      <div class="section-title">Notes</div>
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
