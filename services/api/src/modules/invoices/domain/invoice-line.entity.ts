import { invoiceLineNetCents } from "@corely/contracts";

export class InvoiceLine {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly qty: number,
    public readonly unitPriceCents: number
  ) {}

  get lineTotal(): number {
    return invoiceLineNetCents(this.qty, this.unitPriceCents);
  }
}
