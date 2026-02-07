import type { LocalDate } from "@corely/kernel";
import { ValidationError } from "@corely/kernel";
import type { CatalogItemDto } from "@corely/contracts";

/**
 * Calculate expiry date from manufacturing date and shelf life days
 */
export const calculateExpiryDate = (mfgDate: LocalDate, shelfLifeDays: number): LocalDate => {
  const date = new Date(mfgDate);
  date.setDate(date.getDate() + shelfLifeDays);
  return date.toISOString().split("T")[0] as LocalDate;
};

/**
 * Validate lot tracking requirements for a product line
 */
export const validateLotTrackingRequirements = (
  catalogItem: CatalogItemDto,
  line: {
    lotNumber?: string | null;
    mfgDate?: LocalDate | null;
    expiryDate?: LocalDate | null;
  }
): void => {
  // If catalog item requires lot tracking, lotNumber is mandatory
  if (catalogItem.requiresLotTracking && !line.lotNumber) {
    throw new ValidationError(
      `Lot number is required for product: ${catalogItem.name}`,
      { productId: catalogItem.id, catalogCode: catalogItem.code }
    );
  }

  // If catalog item requires expiry date, either expiryDate or mfgDate must be provided
  if (catalogItem.requiresExpiryDate && !line.expiryDate && !line.mfgDate) {
    throw new ValidationError(
      `Expiry date or manufacturing date is required for product: ${catalogItem.name}`,
      { productId: catalogItem.id, catalogCode: catalogItem.code }
    );
  }
};

/**
 * Auto-calculate expiry date if mfgDate and shelfLifeDays are present
 * Returns the calculated expiry date or the existing one
 */
export const resolveExpiryDate = (
  mfgDate: LocalDate | null | undefined,
  expiryDate: LocalDate | null | undefined,
  shelfLifeDays: number | null | undefined
): LocalDate | null => {
  // If expiry date is already provided, use it
  if (expiryDate) {
    return expiryDate;
  }

  // Auto-calculate from mfgDate + shelfLifeDays
  if (mfgDate && shelfLifeDays && shelfLifeDays > 0) {
    return calculateExpiryDate(mfgDate, shelfLifeDays);
  }

  return null;
};
