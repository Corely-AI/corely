import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { formatLocalDate, parseLocalDate } from "@corely/kernel";
import type {
  InventoryLotRepositoryPort,
  InventoryLot,
  ListLotsFilter,
  ExpiryItem,
} from "../../application/ports/inventory-lot-repository.port";
import type { InventoryLotStatus } from "../../domain/inventory.types";

@Injectable()
export class PrismaInventoryLotRepository implements InventoryLotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(_tenantId: string, lot: InventoryLot): Promise<void> {
    await this.prisma.inventoryLot.create({
      data: {
        id: lot.id,
        tenantId: lot.tenantId,
        productId: lot.productId,
        lotNumber: lot.lotNumber,
        mfgDate: lot.mfgDate ? new Date(lot.mfgDate as string) : null,
        expiryDate: lot.expiryDate ? new Date(lot.expiryDate as string) : null,
        receivedDate: new Date(lot.receivedDate as string),
        shipmentId: lot.shipmentId ?? null,
        supplierPartyId: lot.supplierPartyId ?? null,
        unitCostCents: lot.unitCostCents ?? null,
        qtyReceived: lot.qtyReceived,
        qtyOnHand: lot.qtyOnHand,
        qtyReserved: lot.qtyReserved,
        status: lot.status as any,
        notes: lot.notes ?? null,
        metadataJson: lot.metadataJson ?? null,
        createdAt: lot.createdAt,
        updatedAt: lot.updatedAt,
        archivedAt: lot.archivedAt ?? null,
      },
    });
  }

  async findById(tenantId: string, lotId: string): Promise<InventoryLot | null> {
    const data = await this.prisma.inventoryLot.findFirst({
      where: { id: lotId, tenantId },
    });
    if (!data) {
      return null;
    }
    return this.mapToEntity(data);
  }

  async findByLotNumber(
    tenantId: string,
    productId: string,
    lotNumber: string
  ): Promise<InventoryLot | null> {
    const data = await this.prisma.inventoryLot.findFirst({
      where: {
        tenantId,
        productId,
        lotNumber,
      },
    });
    if (!data) {
      return null;
    }
    return this.mapToEntity(data);
  }

  async list(
    tenantId: string,
    filter: ListLotsFilter
  ): Promise<{ lots: InventoryLot[]; total: number }> {
    const where: any = {
      tenantId,
      archivedAt: null, // Only return non-archived lots
    };

    if (filter.productId) {
      where.productId = filter.productId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.expiryBefore) {
      where.expiryDate = {
        ...where.expiryDate,
        lte: new Date(filter.expiryBefore as string),
      };
    }

    if (filter.expiryAfter) {
      where.expiryDate = {
        ...where.expiryDate,
        gte: new Date(filter.expiryAfter as string),
      };
    }

    if (filter.shipmentId) {
      where.shipmentId = filter.shipmentId;
    }

    if (filter.supplierPartyId) {
      where.supplierPartyId = filter.supplierPartyId;
    }

    if (filter.qtyOnHandGt !== undefined) {
      where.qtyOnHand = {
        gt: filter.qtyOnHandGt,
      };
    }

    const [lots, total] = await Promise.all([
      this.prisma.inventoryLot.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filter.limit ?? 100,
        skip: filter.offset ?? 0,
      }),
      this.prisma.inventoryLot.count({ where }),
    ]);

    return {
      lots: lots.map((data) => this.mapToEntity(data)),
      total,
    };
  }

  async getExpirySummary(
    tenantId: string,
    days: number
  ): Promise<{ expiringSoon: ExpiryItem[]; expired: ExpiryItem[] }> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    // Get lots expiring soon (between today and future date)
    const expiringSoonData = await this.prisma.inventoryLot.findMany({
      where: {
        tenantId,
        archivedAt: null,
        qtyOnHand: { gt: 0 },
        expiryDate: {
          gte: today,
          lte: futureDate,
        },
        status: "AVAILABLE",
      },
      orderBy: { expiryDate: "asc" },
    });

    // Get expired lots (expiry date before today)
    const expiredData = await this.prisma.inventoryLot.findMany({
      where: {
        tenantId,
        archivedAt: null,
        qtyOnHand: { gt: 0 },
        expiryDate: {
          lt: today,
        },
      },
      orderBy: { expiryDate: "asc" },
    });

    // Get product names for all lots
    const allProductIds = [
      ...new Set([
        ...expiringSoonData.map((lot) => lot.productId),
        ...expiredData.map((lot) => lot.productId),
      ]),
    ];

    // Try to get product names from InventoryProduct first
    const products = await this.prisma.inventoryProduct.findMany({
      where: {
        tenantId,
        id: { in: allProductIds },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const productNameMap = new Map<string, string>();
    products.forEach((p) => productNameMap.set(p.id, p.name));

    const calculateDaysUntilExpiry = (expiryDate: Date | null): number => {
      if (!expiryDate) {
        return 0;
      }
      const diffTime = expiryDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const mapToExpiryItem = (data: any): ExpiryItem => ({
      lotId: data.id,
      lotNumber: data.lotNumber,
      productId: data.productId,
      productName: productNameMap.get(data.productId),
      expiryDate: data.expiryDate ? formatLocalDate(data.expiryDate) : null,
      qtyOnHand: data.qtyOnHand,
      daysUntilExpiry: calculateDaysUntilExpiry(data.expiryDate),
    });

    return {
      expiringSoon: expiringSoonData.map(mapToExpiryItem),
      expired: expiredData.map(mapToExpiryItem),
    };
  }

  private mapToEntity(data: any): InventoryLot {
    return {
      id: data.id,
      tenantId: data.tenantId,
      productId: data.productId,
      lotNumber: data.lotNumber,
      mfgDate: data.mfgDate ? formatLocalDate(data.mfgDate) : null,
      expiryDate: data.expiryDate ? formatLocalDate(data.expiryDate) : null,
      receivedDate: formatLocalDate(data.receivedDate),
      shipmentId: data.shipmentId ?? null,
      supplierPartyId: data.supplierPartyId ?? null,
      unitCostCents: data.unitCostCents ?? null,
      qtyReceived: data.qtyReceived,
      qtyOnHand: data.qtyOnHand,
      qtyReserved: data.qtyReserved,
      status: data.status as InventoryLotStatus,
      notes: data.notes ?? null,
      metadataJson: (data.metadataJson as Record<string, any>) ?? null,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      archivedAt: data.archivedAt ?? null,
    };
  }
}
