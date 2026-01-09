import { Injectable } from "@nestjs/common";
import { InvoiceNumberingPort } from "../../application/ports/invoice-numbering.port";

@Injectable()
export class InvoiceNumberingAdapter implements InvoiceNumberingPort {
  async nextInvoiceNumber(_tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getUTCFullYear();
    const randomPart = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    return `INV-${year}-${randomPart}`;
  }
}
