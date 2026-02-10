/**
 * Shipment Cost Service
 *
 * Provides utilities for fetching allocated landed costs from shipments
 * to be used when creating inventory receipts.
 */

import type { ImportShipmentRepositoryPort } from "../ports/import-shipment-repository.port";

export interface ProductCostMapping {
  productId: string;
  unitLandedCostCents: number | null;
  lineId: string;
}

export class ShipmentCostService {
  constructor(private readonly shipmentRepo: ImportShipmentRepositoryPort) {}

  /**
   * Gets the allocated landed costs for all products in a shipment
   * Returns a map of productId -> unitLandedCostCents
   */
  async getShipmentProductCosts(
    tenantId: string,
    shipmentId: string
  ): Promise<Map<string, number | null>> {
    const shipment = await this.shipmentRepo.findById(tenantId, shipmentId);
    if (!shipment) {
      return new Map();
    }

    const costMap = new Map<string, number | null>();
    for (const line of shipment.lines) {
      costMap.set(line.productId, line.unitLandedCostCents);
    }

    return costMap;
  }

  /**
   * Gets detailed cost mapping including line IDs
   */
  async getShipmentCostMappings(
    tenantId: string,
    shipmentId: string
  ): Promise<ProductCostMapping[]> {
    const shipment = await this.shipmentRepo.findById(tenantId, shipmentId);
    if (!shipment) {
      return [];
    }

    return shipment.lines.map((line) => ({
      productId: line.productId,
      unitLandedCostCents: line.unitLandedCostCents,
      lineId: line.id,
    }));
  }
}
