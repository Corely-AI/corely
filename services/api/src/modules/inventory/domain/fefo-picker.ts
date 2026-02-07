/**
 * FEFO (First Expired, First Out) Picking Strategy
 *
 * Allocates inventory based on expiry dates to minimize waste.
 * Picks from lots with nearest expiry dates first.
 */

import type { InventoryLotProps } from "./inventory-lot.entity";

export interface PickRequest {
  productId: string;
  quantityRequested: number;
}

export interface PickAllocation {
  lotId: string;
  lotNumber: string;
  quantityPicked: number;
  expiryDate: string | null;
  unitCostCents: number | null;
}

export interface PickResult {
  productId: string;
  quantityRequested: number;
  quantityAllocated: number;
  allocations: PickAllocation[];
  shortfall: number; // quantityRequested - quantityAllocated
}

/**
 * Picks inventory using FEFO strategy
 * @param availableLots Lots available for picking (filtered by product, sorted by expiry)
 * @param quantityRequested Quantity needed
 * @returns Pick allocations
 */
export function pickFEFO(
  availableLots: InventoryLotProps[],
  quantityRequested: number,
): PickResult {
  const allocations: PickAllocation[] = [];
  let remainingQty = quantityRequested;

  // Sort lots by expiry date (earliest first)
  // Lots without expiry date are considered last
  const sortedLots = [...availableLots].sort((a, b) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1; // a goes last
    if (!b.expiryDate) return -1; // b goes last
    return a.expiryDate.localeCompare(b.expiryDate);
  });

  // Allocate from lots in expiry order
  for (const lot of sortedLots) {
    if (remainingQty <= 0) break;

    const availableInLot = lot.qtyOnHand - lot.qtyReserved;
    if (availableInLot <= 0) continue; // Skip lots with no available quantity

    const quantityToPick = Math.min(remainingQty, availableInLot);

    allocations.push({
      lotId: lot.id,
      lotNumber: lot.lotNumber,
      quantityPicked: quantityToPick,
      expiryDate: lot.expiryDate,
      unitCostCents: lot.unitCostCents,
    });

    remainingQty -= quantityToPick;
  }

  return {
    productId: availableLots[0]?.productId || "",
    quantityRequested,
    quantityAllocated: quantityRequested - remainingQty,
    allocations,
    shortfall: remainingQty,
  };
}

/**
 * Picks inventory for multiple products using FEFO
 */
export function pickMultipleFEFO(
  requests: PickRequest[],
  lotsByProduct: Map<string, InventoryLotProps[]>,
): PickResult[] {
  return requests.map((request) => {
    const lots = lotsByProduct.get(request.productId) || [];
    return pickFEFO(lots, request.quantityRequested);
  });
}

/**
 * Validates pick result - checks if full allocation was achieved
 */
export function validatePickResult(result: PickResult): {
  valid: boolean;
  message?: string;
} {
  if (result.shortfall > 0) {
    return {
      valid: false,
      message: `Insufficient inventory: ${result.shortfall} units short for product ${result.productId}`,
    };
  }
  return { valid: true };
}

/**
 * Calculates weighted average cost for a pick result
 */
export function calculateWeightedAverageCost(result: PickResult): number | null {
  let totalCost = 0;
  let totalQty = 0;

  for (const allocation of result.allocations) {
    if (allocation.unitCostCents !== null) {
      totalCost += allocation.unitCostCents * allocation.quantityPicked;
      totalQty += allocation.quantityPicked;
    }
  }

  return totalQty > 0 ? Math.round(totalCost / totalQty) : null;
}
