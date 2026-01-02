import type { TaxConsultantEntity } from "../entities";

export abstract class TaxConsultantRepoPort {
  abstract get(tenantId: string): Promise<TaxConsultantEntity | null>;
  abstract upsert(
    tenantId: string,
    input: Omit<TaxConsultantEntity, "id" | "tenantId" | "createdAt" | "updatedAt">
  ): Promise<TaxConsultantEntity>;
}
