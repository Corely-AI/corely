import { type InvoiceAggregate } from "../../domain/invoice.aggregate";
import { type InvoiceStatus } from "../../domain/invoice.types";

export type ListInvoicesFilters = {
  status?: InvoiceStatus;
  customerPartyId?: string;
  fromDate?: Date;
  toDate?: Date;
};

export type ListInvoicesResult = {
  items: InvoiceAggregate[];
  nextCursor?: string | null;
};

export interface InvoiceRepoPort {
  findById(workspaceId: string, invoiceId: string): Promise<InvoiceAggregate | null>;
  list(
    workspaceId: string,
    filters: ListInvoicesFilters,
    pageSize?: number,
    cursor?: string
  ): Promise<ListInvoicesResult>;
  save(workspaceId: string, invoice: InvoiceAggregate): Promise<void>;
  create(workspaceId: string, invoice: InvoiceAggregate): Promise<void>;
  isInvoiceNumberTaken(workspaceId: string, number: string): Promise<boolean>;
}
