import type { CustomerPackageStatus } from "../../domain/package.types";

export type CustomerPackageRecord = {
  customerPackageId: string;
  tenantId: string;
  customerPartyId: string;
  name: string;
  status: CustomerPackageStatus;
  totalUnits: number;
  remainingUnits: number;
  expiresOn?: Date | null;
  notes?: string | null;
  createdByEmployeePartyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PackageUsageRecord = {
  usageId: string;
  tenantId: string;
  customerPackageId: string;
  customerPartyId: string;
  unitsUsed: number;
  usedAt: Date;
  sourceType?: string | null;
  sourceId?: string | null;
  notes?: string | null;
  createdByEmployeePartyId?: string | null;
  createdAt: Date;
};

export type Pagination = {
  cursor?: string;
  pageSize: number;
};

export type ListResult<T> = {
  items: T[];
  nextCursor?: string | null;
};

export type PackageListFilters = {
  customerPartyId?: string;
  status?: CustomerPackageStatus;
  includeInactive?: boolean;
};

export const PACKAGE_REPOSITORY_PORT = "engagement/package-repository";

export interface PackageRepositoryPort {
  createPackage(record: CustomerPackageRecord): Promise<void>;
  findPackageById(
    tenantId: string,
    customerPackageId: string
  ): Promise<CustomerPackageRecord | null>;
  listPackages(
    tenantId: string,
    filters: PackageListFilters,
    pagination: Pagination
  ): Promise<ListResult<CustomerPackageRecord>>;
  consumePackageUnits(params: {
    tenantId: string;
    customerPackageId: string;
    unitsUsed: number;
    usage: PackageUsageRecord;
  }): Promise<{ customerPackage: CustomerPackageRecord; usage: PackageUsageRecord } | null>;
  listUsage(
    tenantId: string,
    customerPackageId: string,
    pagination: Pagination
  ): Promise<ListResult<PackageUsageRecord>>;
}
