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
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
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
    paymentLines.push(this.renderFooterLine("IBAN", payment?.iban, { nowrap: true }));
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
      font-size: 9.5pt;
      line-height: 1.35;
      color: #4a4a4a;
      background: #f1f1f1;
    }
    .container {
      position: relative;
      padding: 18mm 20mm 14mm;
      min-height: 297mm;
      background: #f1f1f1;
    }
    .top-accent {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 22mm;
      background: #b9e9ff;
      border-bottom-left-radius: 55% 10mm;
      border-bottom-right-radius: 45% 8mm;
    }
    .content {
      margin-top: 26mm;
    }
    .company-line {
      font-size: 8.8pt;
      color: #666;
      letter-spacing: 0.2px;
      margin-bottom: 18px;
    }
    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-weight: 600;
      font-size: 8.5pt;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
      color: #9a9a9a;
    }
    .bill-to {
      line-height: 1.45;
    }
    .dates {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 26px;
      margin-top: 4px;
    }
    .date-item {
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 10px;
      margin-bottom: 4px;
    }
    .date-label {
      font-weight: 600;
      font-size: 8.5pt;
      color: #9a9a9a;
    }
    .date-value {
      font-size: 9.8pt;
      color: #4a4a4a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    thead {
      display: table-header-group;
    }
    thead th {
      padding: 6px 6px 7px;
      text-align: left;
      font-weight: 600;
      color: #9a9a9a;
      font-size: 8.5pt;
      border-bottom: 1px solid #b9e9ff;
    }
    tbody td {
      padding: 7px 6px;
      border-bottom: 1px solid #eaeaea;
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .totals {
      margin-top: 14px;
      margin-left: auto;
      width: 245px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      font-size: 9.6pt;
    }
    .total-row.grand {
      font-weight: 700;
      font-size: 10.2pt;
      border-top: 1px solid #cfd8dc;
      margin-top: 4px;
      padding-top: 7px;
    }
    .footer-grid {
      margin-top: 56px;
      padding-top: 12px;
      border-top: 1px solid #b9e9ff;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr);
      gap: 14px;
    }
    .footer-block {
      padding: 0;
    }
    .footer-line {
      display: grid;
      grid-template-columns: 72px 1fr;
      gap: 6px;
      margin-bottom: 3px;
      font-size: 8.1pt;
      line-height: 1.35;
    }
    .footer-label {
      color: #9a9a9a;
      font-weight: 600;
    }
    .footer-value {
      color: #4a4a4a;
      word-break: break-word;
    }
    .footer-value.nowrap {
      white-space: nowrap;
      word-break: normal;
      overflow-wrap: normal;
    }
    .footer-value.link {
      color: #147f8a;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="top-accent"></div>
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
              model.serviceDate
                ? `<div class="date-item">
                    <div class="date-label">Service date</div>
                    <div class="date-value">${this.escapeHtml(model.serviceDate)}</div>
                  </div>`
                : ""
            }
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
          <span>Total amount (Net)</span>
          <span>${this.escapeHtml(model.totals.subtotal)}</span>
        </div>
        ${
          model.totals.vatRate && model.totals.vatAmount
            ? `<div class="total-row">
                <span>VAT ${this.escapeHtml(model.totals.vatRate)}</span>
                <span>${this.escapeHtml(model.totals.vatAmount)}</span>
              </div>`
            : ""
        }
        <div class="total-row grand">
          <span>Total amount (Gross)</span>
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

  private renderFooterLine(label: string, value?: string, opts?: { nowrap?: boolean }): string {
    if (!value) {
      return "";
    }

    const escapedValue = this.escapeHtml(value);
    const formattedValue =
      opts?.nowrap === true ? escapedValue.replace(/ /g, "&nbsp;") : escapedValue;
    const valueClass = opts?.nowrap === true ? "footer-value nowrap" : "footer-value";

    return `<div class="footer-line"><span class="footer-label">${this.escapeHtml(label)}:</span><span class="${valueClass}">${formattedValue}</span></div>`;
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
