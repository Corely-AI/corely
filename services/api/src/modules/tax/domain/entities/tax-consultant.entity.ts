export interface TaxConsultantEntity {
  id: string;
  tenantId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
