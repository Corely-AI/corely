import { InvoiceLine } from "./InvoiceLine";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID";

export class Invoice {
  public issuedAt: Date | null;

  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public status: InvoiceStatus,
    public totalCents: number,
    public readonly currency: string,
    public readonly clientId: string | null,
    public readonly lines: InvoiceLine[],
    issuedAt?: Date | null,
    public custom: Record<string, unknown> | null = null
  ) {
    this.issuedAt = issuedAt ?? null;
  }

  issue(at: Date) {
    if (this.status !== "DRAFT") return;
    this.status = "ISSUED";
    this.issuedAt = at;
  }
}
