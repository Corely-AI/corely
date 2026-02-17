import type { LeadAggregate } from "../../domain/lead.aggregate";

export type ListLeadsFilters = {
  status?: string;
  search?: string;
};

export interface LeadRepoPort {
  create(tenantId: string, lead: LeadAggregate): Promise<void>;
  update(tenantId: string, lead: LeadAggregate): Promise<void>;
  findById(tenantId: string, id: string): Promise<LeadAggregate | null>;
  list(tenantId: string, filters?: ListLeadsFilters): Promise<LeadAggregate[]>;
}

export const LEAD_REPO_PORT = Symbol("LEAD_REPO_PORT");
