export class InvoiceLine {
  constructor(
    public readonly id: string,
    public readonly description: string,
    public readonly qty: number,
    public readonly unitPriceCents: number
  ) {}

  get lineTotal(): number {
    return this.qty * this.unitPriceCents;
  }
}
