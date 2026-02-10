import type { PartyRoleType } from "@corely/contracts";
import { type PartyAggregate } from "../../domain/party.aggregate";

export type ListCustomersFilters = {
  includeArchived?: boolean;
  role?: PartyRoleType;
};

export type Pagination = {
  pageSize?: number;
  cursor?: string;
};

export type ListCustomersResult = {
  items: PartyAggregate[];
  nextCursor?: string | null;
};

export interface PartyRepoPort {
  createCustomer(tenantId: string, party: PartyAggregate): Promise<void>;
  updateCustomer(tenantId: string, party: PartyAggregate): Promise<void>;
  findCustomerById(
    tenantId: string,
    partyId: string,
    role?: PartyRoleType
  ): Promise<PartyAggregate | null>;
  findPartyById(tenantId: string, partyId: string): Promise<PartyAggregate | null>;
  ensurePartyRole(tenantId: string, partyId: string, role: PartyRoleType): Promise<void>;
  listCustomers(
    tenantId: string,
    filters: ListCustomersFilters,
    pagination: Pagination
  ): Promise<ListCustomersResult>;
  searchCustomers(
    tenantId: string,
    q: string | undefined,
    role: PartyRoleType | undefined,
    pagination: Pagination
  ): Promise<ListCustomersResult>;
  findPartyByEmail(tenantId: string, email: string): Promise<PartyAggregate | null>;
}
