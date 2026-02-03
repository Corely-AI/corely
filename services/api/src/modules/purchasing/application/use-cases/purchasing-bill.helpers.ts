import { ValidationError, type IdGeneratorPort } from "@corely/kernel";
import type { VendorBillLineItem } from "../../domain/purchasing.types";

const requireValue = <T>(value: T | null | undefined, label: string): NonNullable<T> => {
  if (value === null || value === undefined) {
    throw new ValidationError(`${label} is required`);
  }
  return value as NonNullable<T>;
};

export const buildLineItems = (params: {
  idGenerator: IdGeneratorPort;
  lineItems: Array<{
    id?: string;
    description?: string;
    quantity?: number;
    unitCostCents?: number;
    category?: string;
    glAccountId?: string;
    taxCode?: string;
    sortOrder?: number;
  }>;
}): VendorBillLineItem[] =>
  params.lineItems.map((item, idx) => ({
    id: item.id ?? params.idGenerator.newId(),
    description: requireValue(item.description, "description"),
    quantity: requireValue(item.quantity, "quantity"),
    unitCostCents: requireValue(item.unitCostCents, "unitCostCents"),
    category: item.category,
    glAccountId: item.glAccountId,
    taxCode: item.taxCode,
    sortOrder: item.sortOrder ?? idx,
  }));
