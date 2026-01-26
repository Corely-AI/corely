import { type IssuerSnapshot } from "../../domain/invoice.types";

export interface LegalEntityQueryPort {
  getIssuerSnapshot(tenantId: string, legalEntityId?: string): Promise<IssuerSnapshot | null>;
}

export const LEGAL_ENTITY_QUERY_PORT = "invoices/legal-entity-query";
