import type {
  PartyRepoPort,
  ListCustomersFilters,
  Pagination,
} from "../application/ports/party-repository.port";
import type { PartyRoleType } from "@corely/contracts";
import { type PartyAggregate } from "../domain/party.aggregate";

export class InMemoryPartyRepo implements PartyRepoPort {
  customers: PartyAggregate[] = [];

  async createCustomer(tenantId: string, party: PartyAggregate): Promise<void> {
    if (tenantId !== party.tenantId) {
      throw new Error("Tenant mismatch");
    }
    this.customers.push(party);
  }

  async updateCustomer(tenantId: string, party: PartyAggregate): Promise<void> {
    if (tenantId !== party.tenantId) {
      throw new Error("Tenant mismatch");
    }
    const index = this.customers.findIndex((c) => c.id === party.id && c.tenantId === tenantId);
    if (index === -1) {
      throw new Error("Customer not found");
    }
    this.customers[index] = party;
  }

  async findCustomerById(
    tenantId: string,
    partyId: string,
    role?: PartyRoleType
  ): Promise<PartyAggregate | null> {
    const requestedRole = role ?? "CUSTOMER";
    return (
      this.customers.find(
        (c) => c.id === partyId && c.tenantId === tenantId && c.roles.includes(requestedRole)
      ) ?? null
    );
  }

  async findPartyById(tenantId: string, partyId: string): Promise<PartyAggregate | null> {
    return this.customers.find((c) => c.id === partyId && c.tenantId === tenantId) ?? null;
  }

  async ensurePartyRole(tenantId: string, partyId: string, role: PartyRoleType): Promise<void> {
    const existing = this.customers.find((c) => c.id === partyId && c.tenantId === tenantId);
    if (!existing) {
      throw new Error("Party not found");
    }
    if (!existing.roles.includes(role)) {
      existing.roles.push(role);
    }
  }

  async listCustomers(tenantId: string, filters: ListCustomersFilters, pagination: Pagination) {
    const startIndex = pagination.cursor
      ? this.customers.findIndex((c) => c.id === pagination.cursor) + 1
      : 0;
    let items = this.customers.filter((c) => c.tenantId === tenantId);
    const role = filters.role ?? "CUSTOMER";
    items = items.filter((c) => c.roles.includes(role));
    if (!filters.includeArchived) {
      items = items.filter((c) => !c.archivedAt);
    }
    const slice = items.slice(startIndex, startIndex + (pagination.pageSize ?? 20));
    const nextCursor =
      slice.length === (pagination.pageSize ?? 20) ? (slice.at(-1)?.id ?? null) : null;
    return { items: slice, nextCursor };
  }

  async searchCustomers(
    tenantId: string,
    q: string | undefined,
    role: PartyRoleType | undefined,
    pagination: Pagination
  ) {
    const startIndex = pagination.cursor
      ? this.customers.findIndex((c) => c.id === pagination.cursor) + 1
      : 0;
    const requestedRole = role ?? "CUSTOMER";
    let items = this.customers.filter(
      (c) => c.tenantId === tenantId && !c.archivedAt && c.roles.includes(requestedRole)
    );

    // Only filter by search terms if q is provided
    if (q && q.trim()) {
      const terms = q.toLowerCase();
      items = items.filter((c) => {
        const matchesDisplay = c.displayName.toLowerCase().includes(terms);
        const matchesEmail = (c.primaryEmail ?? "").toLowerCase().includes(terms);
        const matchesPhone = (c.primaryPhone ?? "").toLowerCase().includes(terms);
        const matchesVat = (c.vatId ?? "").toLowerCase().includes(terms);
        return matchesDisplay || matchesEmail || matchesPhone || matchesVat;
      });
    }

    const slice = items.slice(startIndex, startIndex + (pagination.pageSize ?? 20));
    const nextCursor =
      slice.length === (pagination.pageSize ?? 20) ? (slice.at(-1)?.id ?? null) : null;
    return { items: slice, nextCursor };
  }
}
