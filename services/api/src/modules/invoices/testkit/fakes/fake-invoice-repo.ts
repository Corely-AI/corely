import { InvoiceRepositoryPort } from "../../application/ports/InvoiceRepositoryPort";
import { Invoice } from "../../domain/entities/Invoice";

export class FakeInvoiceRepository implements InvoiceRepositoryPort {
  invoices: Invoice[] = [];

  async save(invoice: Invoice): Promise<void> {
    const index = this.invoices.findIndex((i) => i.id === invoice.id);
    if (index >= 0) {
      this.invoices[index] = invoice;
    } else {
      this.invoices.push(invoice);
    }
  }

  async findById(id: string): Promise<Invoice | null> {
    return this.invoices.find((i) => i.id === id) ?? null;
  }
}
