/**
 * Landed Cost Allocation Service
 *
 * Allocates shipment-level costs (freight, insurance, duties, taxes) to individual lines
 * based on allocation method (weight, volume, or FOB value).
 */

import type { ImportShipmentProps, ImportShipmentLineProps } from "./import-shipment.entity";

export type AllocationMethod = "BY_WEIGHT" | "BY_VOLUME" | "BY_FOB_VALUE" | "EQUAL";

export interface LandedCostAllocationInput {
  shipment: ImportShipmentProps;
  allocationMethod: AllocationMethod;
}

export interface AllocatedLine extends ImportShipmentLineProps {
  allocatedFreightCents: number;
  allocatedInsuranceCents: number;
  allocatedDutyCents: number;
  allocatedTaxCents: number;
  allocatedOtherCents: number;
  unitLandedCostCents: number;
}

export interface LandedCostAllocationResult {
  allocatedLines: AllocatedLine[];
  totalAllocatedCents: number;
}

/**
 * Allocates shipment costs to lines based on the selected allocation method
 */
export function allocateLandedCosts(input: LandedCostAllocationInput): LandedCostAllocationResult {
  const { shipment, allocationMethod } = input;

  // Calculate total costs to allocate
  const freightToAllocate = shipment.freightCostCents || 0;
  const insuranceToAllocate = shipment.insuranceCostCents || 0;
  const dutyToAllocate = shipment.customsDutyCents || 0;
  const taxToAllocate = shipment.customsTaxCents || 0;
  const otherToAllocate = shipment.otherCostsCents || 0;

  // Calculate allocation ratios for each line
  const ratios = calculateAllocationRatios(shipment.lines, allocationMethod);

  // Allocate costs to each line
  const allocatedLines: AllocatedLine[] = shipment.lines.map((line, index) => {
    const ratio = ratios[index];

    const allocatedFreightCents = Math.round(freightToAllocate * ratio);
    const allocatedInsuranceCents = Math.round(insuranceToAllocate * ratio);
    const allocatedDutyCents = Math.round(dutyToAllocate * ratio);
    const allocatedTaxCents = Math.round(taxToAllocate * ratio);
    const allocatedOtherCents = Math.round(otherToAllocate * ratio);

    // Calculate total landed cost per line
    const lineFobCost = line.lineFobCostCents || 0;
    const lineTotalLandedCostCents =
      lineFobCost +
      allocatedFreightCents +
      allocatedInsuranceCents +
      allocatedDutyCents +
      allocatedTaxCents +
      allocatedOtherCents;

    // Calculate unit landed cost
    const unitLandedCostCents =
      line.orderedQty > 0 ? Math.round(lineTotalLandedCostCents / line.orderedQty) : 0;

    return {
      ...line,
      allocatedFreightCents,
      allocatedInsuranceCents,
      allocatedDutyCents,
      allocatedTaxCents,
      allocatedOtherCents,
      unitLandedCostCents,
    };
  });

  const totalAllocatedCents = allocatedLines.reduce(
    (sum, line) =>
      sum +
      (line.lineFobCostCents || 0) +
      line.allocatedFreightCents +
      line.allocatedInsuranceCents +
      line.allocatedDutyCents +
      line.allocatedTaxCents +
      line.allocatedOtherCents,
    0
  );

  return {
    allocatedLines,
    totalAllocatedCents,
  };
}

/**
 * Calculates allocation ratios for each line based on the selected method
 * Returns an array of ratios that sum to 1.0
 */
function calculateAllocationRatios(
  lines: ImportShipmentLineProps[],
  method: AllocationMethod
): number[] {
  const lineCount = lines.length;

  if (lineCount === 0) {
    return [];
  }

  switch (method) {
    case "BY_WEIGHT": {
      const totalWeight = lines.reduce((sum, line) => sum + (line.weightKg || 0), 0);
      if (totalWeight === 0) {
        // Fall back to equal allocation if no weights specified
        return lines.map(() => 1 / lineCount);
      }
      return lines.map((line) => (line.weightKg || 0) / totalWeight);
    }

    case "BY_VOLUME": {
      const totalVolume = lines.reduce((sum, line) => sum + (line.volumeM3 || 0), 0);
      if (totalVolume === 0) {
        // Fall back to equal allocation if no volumes specified
        return lines.map(() => 1 / lineCount);
      }
      return lines.map((line) => (line.volumeM3 || 0) / totalVolume);
    }

    case "BY_FOB_VALUE": {
      const totalFobCents = lines.reduce((sum, line) => sum + (line.lineFobCostCents || 0), 0);
      if (totalFobCents === 0) {
        // Fall back to equal allocation if no FOB values specified
        return lines.map(() => 1 / lineCount);
      }
      return lines.map((line) => (line.lineFobCostCents || 0) / totalFobCents);
    }

    case "EQUAL":
    default:
      return lines.map(() => 1 / lineCount);
  }
}

/**
 * Validates that a shipment is ready for landed cost allocation
 */
export function validateShipmentForAllocation(shipment: ImportShipmentProps): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (shipment.status !== "RECEIVED") {
    errors.push("Shipment must be in RECEIVED status to allocate landed costs");
  }

  if (!shipment.lines || shipment.lines.length === 0) {
    errors.push("Shipment must have at least one line");
  }

  // Check if any costs exist to allocate
  const hasCostsToAllocate =
    (shipment.freightCostCents || 0) > 0 ||
    (shipment.insuranceCostCents || 0) > 0 ||
    (shipment.customsDutyCents || 0) > 0 ||
    (shipment.customsTaxCents || 0) > 0 ||
    (shipment.otherCostsCents || 0) > 0;

  if (!hasCostsToAllocate) {
    errors.push("Shipment must have at least one cost component to allocate");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
