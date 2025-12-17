import { Invoice } from "../../domain/entities/Invoice";

export interface InvoiceRepositoryPort {
  save(invoice: Invoice): Promise<void>;
  findById(id: string): Promise<Invoice | null>;
}
