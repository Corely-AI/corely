import { type InvoiceAggregate } from "../../domain/invoice.aggregate";
import { type InvoiceStatus } from "../../domain/invoice.types";

export type ListInvoicesFilters = {
  status?: InvoiceStatus;
  customerPartyId?: string;
  fromDate?: Date;
  toDate?: Date;
  q?: string; // Standard search
  sort?: string; // Standard sort
  structuredFilters?: any[]; // Standard JSON list filters
};

export type ListInvoicesPagination = {
  page?: number;
  pageSize: number;
  cursor?: string;
};

export type ListInvoicesResult = {
  items: InvoiceAggregate[];
  nextCursor?: string | null;
  total: number;
};

export type InvoiceReminderCandidate = {
  id: string;
  number: string | null;
  billToEmail: string | null;
  sentAt: Date | null;
  status: InvoiceStatus;
};

export interface InvoiceRepoPort {
  findById(workspaceId: string, invoiceId: string): Promise<InvoiceAggregate | null>;
  list(
    workspaceId: string,
    filters: ListInvoicesFilters,
    pagination: ListInvoicesPagination
  ): Promise<ListInvoicesResult>;
  listReminderCandidates(
    workspaceId: string,
    sentBefore: Date
  ): Promise<InvoiceReminderCandidate[]>;
  save(workspaceId: string, invoice: InvoiceAggregate): Promise<void>;
  create(workspaceId: string, invoice: InvoiceAggregate): Promise<void>;
  isInvoiceNumberTaken(workspaceId: string, number: string): Promise<boolean>;
}
