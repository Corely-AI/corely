import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  CustomerPackage as CustomerPackageModel,
  PackageUsage as PackageUsageModel,
} from "@prisma/client";
import type {
  CustomerPackageRecord,
  PackageListFilters,
  PackageRepositoryPort,
  PackageUsageRecord,
  Pagination,
  ListResult,
} from "../../application/ports/package-repository.port";

@Injectable()
export class PrismaPackageRepositoryAdapter implements PackageRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createPackage(record: CustomerPackageRecord): Promise<void> {
    await this.prisma.customerPackage.create({
      data: {
        id: record.customerPackageId,
        tenantId: record.tenantId,
        customerPartyId: record.customerPartyId,
        name: record.name,
        status: record.status,
        totalUnits: record.totalUnits,
        remainingUnits: record.remainingUnits,
        expiresOn: record.expiresOn ?? null,
        notes: record.notes ?? null,
        createdByEmployeePartyId: record.createdByEmployeePartyId ?? null,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  }

  async findPackageById(
    tenantId: string,
    customerPackageId: string
  ): Promise<CustomerPackageRecord | null> {
    const row = await this.prisma.customerPackage.findFirst({
      where: { id: customerPackageId, tenantId },
    });
    return row ? this.toPackageRecord(row) : null;
  }

  async listPackages(
    tenantId: string,
    filters: PackageListFilters,
    pagination: Pagination
  ): Promise<ListResult<CustomerPackageRecord>> {
    const where = {
      tenantId,
      ...(filters.customerPartyId ? { customerPartyId: filters.customerPartyId } : {}),
      ...(filters.status
        ? { status: filters.status }
        : filters.includeInactive
          ? {}
          : { status: "ACTIVE" as const }),
    };

    const rows = await this.prisma.customerPackage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(pagination.cursor
        ? {
            cursor: { id: pagination.cursor },
            skip: 1,
          }
        : {}),
      take: pagination.pageSize + 1,
    });

    const items = rows.slice(0, pagination.pageSize).map((row) => this.toPackageRecord(row));
    const nextCursor =
      rows.length > pagination.pageSize ? (rows[pagination.pageSize]?.id ?? null) : null;

    return { items, nextCursor };
  }

  async consumePackageUnits(params: {
    tenantId: string;
    customerPackageId: string;
    unitsUsed: number;
    usage: PackageUsageRecord;
  }): Promise<{ customerPackage: CustomerPackageRecord; usage: PackageUsageRecord } | null> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customerPackage.updateMany({
        where: {
          id: params.customerPackageId,
          tenantId: params.tenantId,
          status: "ACTIVE",
          remainingUnits: { gte: params.unitsUsed },
        },
        data: {
          remainingUnits: { decrement: params.unitsUsed },
        },
      });

      if (updated.count === 0) {
        return null;
      }

      await tx.packageUsage.create({
        data: {
          id: params.usage.usageId,
          tenantId: params.usage.tenantId,
          customerPackageId: params.usage.customerPackageId,
          customerPartyId: params.usage.customerPartyId,
          unitsUsed: params.usage.unitsUsed,
          usedAt: params.usage.usedAt,
          sourceType: params.usage.sourceType ?? null,
          sourceId: params.usage.sourceId ?? null,
          notes: params.usage.notes ?? null,
          createdByEmployeePartyId: params.usage.createdByEmployeePartyId ?? null,
          createdAt: params.usage.createdAt,
        },
      });

      const customerPackage = await tx.customerPackage.findUnique({
        where: { id: params.customerPackageId },
      });
      if (!customerPackage) {
        return null;
      }

      if (customerPackage.remainingUnits <= 0 && customerPackage.status === "ACTIVE") {
        await tx.customerPackage.update({
          where: { id: params.customerPackageId },
          data: {
            status: "DEPLETED",
            updatedAt: new Date(),
          },
        });
        customerPackage.status = "DEPLETED";
      }

      return {
        customerPackage: this.toPackageRecord(customerPackage),
        usage: params.usage,
      };
    });
  }

  async listUsage(
    tenantId: string,
    customerPackageId: string,
    pagination: Pagination
  ): Promise<ListResult<PackageUsageRecord>> {
    const rows = await this.prisma.packageUsage.findMany({
      where: { tenantId, customerPackageId },
      orderBy: { usedAt: "desc" },
      ...(pagination.cursor
        ? {
            cursor: { id: pagination.cursor },
            skip: 1,
          }
        : {}),
      take: pagination.pageSize + 1,
    });

    const items = rows.slice(0, pagination.pageSize).map((row) => this.toUsageRecord(row));
    const nextCursor =
      rows.length > pagination.pageSize ? (rows[pagination.pageSize]?.id ?? null) : null;

    return { items, nextCursor };
  }

  private toPackageRecord(row: CustomerPackageModel): CustomerPackageRecord {
    return {
      customerPackageId: row.id,
      tenantId: row.tenantId,
      customerPartyId: row.customerPartyId,
      name: row.name,
      status: row.status,
      totalUnits: row.totalUnits,
      remainingUnits: row.remainingUnits,
      expiresOn: row.expiresOn ?? null,
      notes: row.notes ?? null,
      createdByEmployeePartyId: row.createdByEmployeePartyId ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private toUsageRecord(row: PackageUsageModel): PackageUsageRecord {
    return {
      usageId: row.id,
      tenantId: row.tenantId,
      customerPackageId: row.customerPackageId,
      customerPartyId: row.customerPartyId,
      unitsUsed: row.unitsUsed,
      usedAt: row.usedAt,
      sourceType: row.sourceType ?? null,
      sourceId: row.sourceId ?? null,
      notes: row.notes ?? null,
      createdByEmployeePartyId: row.createdByEmployeePartyId ?? null,
      createdAt: row.createdAt,
    };
  }
}
