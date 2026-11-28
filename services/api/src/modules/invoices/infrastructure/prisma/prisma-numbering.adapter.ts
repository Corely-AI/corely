import { Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { InvoiceNumberingPort } from "../../application/ports/invoice-numbering.port";

@Injectable()
export class InvoiceNumberingAdapter implements InvoiceNumberingPort {
  async nextInvoiceNumber(_workspaceId: string, issuedAt: Date): Promise<string> {
    const year = issuedAt.getUTCFullYear();
    const randomPart = randomInt(100000).toString().padStart(5, "0");
    return `INV-${year}-${randomPart}`;
  }
}
