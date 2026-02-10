import {
  type InvoiceRepoPort,
  type ListInvoicesFilters,
  type ListInvoicesResult,
} from "../../application/ports/invoice-repository.port";
import { type InvoiceAggregate } from "../../domain/invoice.aggregate";

export class FakeInvoiceRepository implements InvoiceRepoPort {
  invoices: InvoiceAggregate[] = [];

  async save(tenantId: string, invoice: InvoiceAggregate): Promise<void> {
    if (tenantId !== invoice.tenantId) {
      throw new Error("Tenant mismatch when saving invoice");
    }
    const index = this.invoices.findIndex(
      (i) => i.id === invoice.id && i.tenantId === invoice.tenantId
    );
    if (index >= 0) {
      this.invoices[index] = invoice;
    } else {
      this.invoices.push(invoice);
    }
  }

  async create(tenantId: string, invoice: InvoiceAggregate): Promise<void> {
    return this.save(tenantId, invoice);
  }

  async findById(tenantId: string, id: string): Promise<InvoiceAggregate | null> {
    return this.invoices.find((i) => i.id === id && i.tenantId === tenantId) ?? null;
  }

  async list(
    tenantId: string,
    filters: ListInvoicesFilters,
    pagination: { page?: number; pageSize: number; cursor?: string }
  ): Promise<ListInvoicesResult> {
    const { pageSize } = pagination;
    const startIndex = pagination.cursor
      ? this.invoices.findIndex((i) => i.id === pagination.cursor) + 1
      : pagination.page
        ? (pagination.page - 1) * pageSize
        : 0;

    let items = this.invoices.filter((i) => i.tenantId === tenantId);

    if (filters.status) {
      items = items.filter((i) => i.status === filters.status);
    }
    if (filters.customerPartyId) {
      items = items.filter((i) => i.customerPartyId === filters.customerPartyId);
    }
    if (filters.fromDate) {
      items = items.filter((i) => i.createdAt >= filters.fromDate!);
    }
    if (filters.toDate) {
      items = items.filter((i) => i.createdAt <= filters.toDate!);
    }
    // Simple Q search
    if (filters.q) {
      const lowerQ = filters.q.toLowerCase();
      items = items.filter(
        (i) =>
          i.number?.toLowerCase().includes(lowerQ) || i.billToName?.toLowerCase().includes(lowerQ)
      );
    }
    // Handle structured status 'in'
    if (filters.structuredFilters?.length) {
      for (const f of filters.structuredFilters) {
        if (f.field === "status" && f.operator === "in" && Array.isArray(f.value)) {
          items = items.filter((i) => f.value.includes(i.status));
        }
      }
    }

    // Sort mock (basic)
    if (filters.sort) {
      const [field, dir] = filters.sort.split(":");
      if (field === "issuedAt" || field === "createdAt") {
        items.sort((a, b) => {
          const da = (a as any)[field] ?? new Date(0);
          const db = (b as any)[field] ?? new Date(0);
          return dir === "asc" ? da.getTime() - db.getTime() : db.getTime() - da.getTime();
        });
      }
    }

    const total = items.length;
    const slice = items.slice(startIndex, startIndex + pageSize);
    const nextCursor =
      slice.length === pageSize && startIndex + pageSize < items.length
        ? slice[slice.length - 1].id
        : null;

    return { items: slice, nextCursor, total };
  }

  async listReminderCandidates() {
    return [];
  }

  async isInvoiceNumberTaken(tenantId: string, number: string): Promise<boolean> {
    return this.invoices.some((i) => i.tenantId === tenantId && i.number === number);
  }
}
