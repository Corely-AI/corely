import { Injectable, Logger } from "@nestjs/common";
import type { Browser } from "playwright";
import type {
  InvoicePdfRendererPort,
  InvoicePdfModel,
} from "../application/ports/invoice-pdf-renderer.port";

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
      throw new Error(
        `PDF generation failed: ${error instanceof Error ? error.message : "unknown error"}`
      );
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
    const payment = model.paymentSnapshot;

    const taxLines = [
      this.renderFooterLine("VAT ID", model.issuerInfo?.vatId),
      this.renderFooterLine("Tax ID", model.issuerInfo?.taxId),
    ].join("");

    const paymentLines: string[] = [];
    paymentLines.push(this.renderFooterLine("Method", payment?.label ?? payment?.type));
    paymentLines.push(this.renderFooterLine("Account", payment?.accountHolderName));
    paymentLines.push(this.renderFooterLine("IBAN", payment?.iban));
    paymentLines.push(this.renderFooterLine("BIC", payment?.bic));
    paymentLines.push(this.renderFooterLine("Bank", payment?.bankName));
    paymentLines.push(this.renderFooterLine("Reference", payment?.referenceText));
    paymentLines.push(this.renderFooterLine("Instructions", payment?.instructions));
    paymentLines.push(this.renderFooterLinkLine("Pay link", payment?.payUrl));

    const contactLines = [
      this.renderFooterLine("Phone", model.issuerInfo?.phone),
      this.renderFooterLine("Email", model.issuerInfo?.email),
      this.renderFooterLine("Website", model.issuerInfo?.website),
    ].join("");
    const paymentContent = paymentLines.filter(Boolean).join("");

    const taxSectionHtml = taxLines
      ? `<div class="footer-block">
          <div class="section-title">Tax details</div>
          ${taxLines}
        </div>`
      : "";

    const paymentSectionHtml = paymentContent
      ? `<div class="footer-block">
          <div class="section-title">Payment method</div>
          ${paymentContent}
        </div>`
      : "";

    const contactSectionHtml = contactLines
      ? `<div class="footer-block">
          <div class="section-title">Contact details</div>
          ${contactLines}
        </div>`
      : "";

    const footerHtml = [taxSectionHtml, paymentSectionHtml, contactSectionHtml]
      .filter(Boolean)
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
      color: #2b2b2b;
    }
    .container {
      padding: 20mm 15mm;
      min-height: 257mm;
      display: flex;
      flex-direction: column;
    }
    .content {
      flex: 1;
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
    .footer-grid {
      margin-top: auto;
      padding-top: 18px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }
    .footer-block {
      padding: 0;
    }
    .footer-line {
      display: grid;
      grid-template-columns: 82px 1fr;
      gap: 8px;
      margin-bottom: 4px;
      font-size: 9pt;
      line-height: 1.45;
    }
    .footer-label {
      color: #8a8a8a;
      font-weight: 600;
    }
    .footer-value {
      color: #2b2b2b;
      word-break: break-word;
    }
    .footer-value.link {
      color: #147f8a;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
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
              <div class="date-label">Invoice no.</div>
              <div class="date-value">${this.escapeHtml(model.invoiceNumber)}</div>
            </div>
            <div class="date-item">
              <div class="date-label">Issue date</div>
              <div class="date-value">${this.escapeHtml(model.issueDate)}</div>
            </div>
            ${
              model.dueDate
                ? `<div class="date-item">
                    <div class="date-label">Due date</div>
                    <div class="date-value">${this.escapeHtml(model.dueDate)}</div>
                  </div>`
                : ""
            }
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Details</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Unit price</th>
              <th style="text-align: right;">Line total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="total-row">
          <span>Subtotal</span>
          <span>${this.escapeHtml(model.totals.subtotal)}</span>
        </div>
        <div class="total-row grand">
          <span>Total (${this.escapeHtml(model.currency)})</span>
          <span>${this.escapeHtml(model.totals.total)}</span>
        </div>
      </div>

      ${
        model.notes
          ? `<div class="section">
              <div class="section-title">Notes</div>
              <div>${this.escapeHtml(model.notes)}</div>
            </div>`
          : ""
      }
    </div>
    ${footerHtml ? `<div class="footer-grid">${footerHtml}</div>` : ""}
  </div>
</body>
</html>
`;
  }

  private renderFooterLine(label: string, value?: string): string {
    if (!value) {
      return "";
    }

    return `<div class="footer-line"><span class="footer-label">${this.escapeHtml(label)}:</span><span class="footer-value">${this.escapeHtml(value)}</span></div>`;
  }

  private renderFooterLinkLine(label: string, value?: string): string {
    if (!value) {
      return "";
    }

    const escapedLabel = this.escapeHtml(label);
    const escapedValue = this.escapeHtml(value);

    return `<div class="footer-line"><span class="footer-label">${escapedLabel}:</span><a class="footer-value link" href="${escapedValue}" target="_blank" rel="noreferrer">${escapedValue}</a></div>`;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
