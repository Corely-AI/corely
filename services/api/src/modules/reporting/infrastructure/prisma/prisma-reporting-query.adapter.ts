import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { ReportingQueryPort } from "../../application/ports/reporting-query.port";
import type {
  PLSummary,
  VATSummary,
  ExciseSummary,
  InventoryBalance,
  ExpiryAlerts,
  ImportActivity,
} from "@corely/contracts";

@Injectable()
export class PrismaReportingQueryAdapter implements ReportingQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async countExpenses(tenantId: string): Promise<number> {
    return this.prisma.expense.count({ where: { tenantId } });
  }

  async getPLSummary(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string
  ): Promise<PLSummary> {
    // Query journal entries for revenue and COGS accounts
    // For MVP: placeholder implementation
    // TODO: Query accounting.JournalLine where account is revenue/COGS

    const revenueCents = 0; // Sum of revenue account debits
    const cogsCents = 0; // Sum of COGS account debits
    const grossMarginCents = revenueCents - cogsCents;
    const grossMarginPercent = revenueCents > 0 ? (grossMarginCents / revenueCents) * 100 : 0;

    return {
      revenueCents,
      cogsCents,
      grossMarginCents,
      grossMarginPercent,
    };
  }

  async getVATSummary(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string
  ): Promise<VATSummary> {
    // Query VAT period summaries
    // For MVP: simplified query
    const vatPeriods = await this.prisma.vatPeriodSummary.findMany({
      where: {
        tenantId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
    });

    const inputVatCents = 0;
    let outputVatCents = 0;

    for (const period of vatPeriods) {
      try {
        const totals = JSON.parse(period.totalsByKindJson);
        // Extract VAT amounts from totals
        if (totals.STANDARD) {
          outputVatCents += totals.STANDARD.taxAmountCents || 0;
        }
        if (totals.REDUCED) {
          outputVatCents += totals.REDUCED.taxAmountCents || 0;
        }
      } catch (error) {
        // Skip invalid JSON
      }
    }

    const netVatPayableCents = outputVatCents - inputVatCents;

    return {
      inputVatCents,
      outputVatCents,
      netVatPayableCents,
    };
  }

  async getExciseSummary(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string
  ): Promise<ExciseSummary> {
    // Query excise reports or tax snapshots
    // For MVP: placeholder
    // TODO: Query TaxSnapshot.breakdownJson for excise amounts

    return {
      totalExciseCents: 0,
      byProduct: [],
    };
  }

  async getInventoryBalance(
    tenantId: string,
    asOfDate: Date,
    currency: string
  ): Promise<InventoryBalance> {
    // Query inventory lots for current balance
    // For MVP: simplified query
    const lots = await this.prisma.inventoryLot.findMany({
      where: {
        tenantId,
        qtyOnHand: { gt: 0 },
      },
      include: {
        product: true,
      } as any,
    });

    let totalValueCents = 0;
    let totalQuantity = 0;
    const productMap = new Map<
      string,
      { productId: string; productName: string; quantity: number; valueCents: number }
    >();

    for (const lot of lots) {
      const valueCents = (lot.unitCostCents || 0) * lot.qtyOnHand;
      totalValueCents += valueCents;
      totalQuantity += lot.qtyOnHand;

      const existing = productMap.get(lot.productId);
      if (existing) {
        existing.quantity += lot.qtyOnHand;
        existing.valueCents += valueCents;
      } else {
        productMap.set(lot.productId, {
          productId: lot.productId,
          productName: lot.product?.name || "Unknown",
          quantity: lot.qtyOnHand,
          valueCents,
        });
      }
    }

    return {
      totalValueCents,
      totalQuantity,
      byProduct: Array.from(productMap.values()),
    };
  }

  async getExpiryAlerts(tenantId: string, asOfDate: Date): Promise<ExpiryAlerts> {
    // Query lots expiring soon
    const now = asOfDate;
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);
    const in60Days = new Date(now);
    in60Days.setDate(in60Days.getDate() + 60);
    const in90Days = new Date(now);
    in90Days.setDate(in90Days.getDate() + 90);

    const lots = await this.prisma.inventoryLot.findMany({
      where: {
        tenantId,
        expiryDate: { not: null },
        qtyOnHand: { gt: 0 },
      },
      include: {
        product: true,
      } as any,
      orderBy: {
        expiryDate: "asc",
      },
    });

    let expiring30Days = 0;
    let expiring60Days = 0;
    let expiring90Days = 0;
    let expired = 0;

    const items = lots.map((lot) => {
      const expiryDate = lot.expiryDate ? new Date(lot.expiryDate) : null;
      const daysUntilExpiry = expiryDate
        ? Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      if (daysUntilExpiry !== null) {
        if (daysUntilExpiry < 0) {
          expired++;
        } else if (daysUntilExpiry <= 30) {
          expiring30Days++;
        } else if (daysUntilExpiry <= 60) {
          expiring60Days++;
        } else if (daysUntilExpiry <= 90) {
          expiring90Days++;
        }
      }

      return {
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        productId: lot.productId,
        productName: (lot as any).product?.name || "Unknown",
        quantity: lot.qtyOnHand,
        expiryDate: lot.expiryDate ? new Date(lot.expiryDate).toISOString() : "",
        daysUntilExpiry: daysUntilExpiry !== null ? daysUntilExpiry : 0,
      };
    });

    return {
      expiring30Days,
      expiring60Days,
      expiring90Days,
      expired,
      items: items as any,
    };
  }

  async getImportActivity(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    currency: string
  ): Promise<ImportActivity> {
    // Query import shipments received in period
    const shipments = await this.prisma.importShipment.findMany({
      where: {
        tenantId,
        actualArrivalDate: {
          gte: periodStart,
          lte: periodEnd,
        },
        status: "RECEIVED",
      },
    });

    let totalLandedCostCents = 0;
    let totalDutiesCents = 0;
    let totalExciseCents = 0;

    const shipmentDetails = shipments.map((shipment) => {
      const landedCostCents = shipment.totalLandedCostCents || 0;
      totalLandedCostCents += landedCostCents;
      totalDutiesCents += shipment.customsDutyCents || 0;
      totalExciseCents += 0; // TODO: Extract excise from shipment

      return {
        shipmentId: shipment.id,
        shipmentNumber: shipment.shipmentNumber,
        supplierName: shipment.supplierPartyId || "Unknown", // TODO: Join with Party table
        receivedDate: shipment.actualArrivalDate
          ? new Date(shipment.actualArrivalDate).toISOString()
          : "",
        landedCostCents,
      };
    });

    return {
      shipmentsReceived: shipments.length,
      totalLandedCostCents,
      totalDutiesCents,
      totalExciseCents,
      shipments: shipmentDetails as any,
    };
  }
}
