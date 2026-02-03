import { ValidationError, type IdGeneratorPort } from "@corely/kernel";
import type { OrderLineItem } from "../../domain/sales.types";

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
    unitPriceCents?: number;
    discountCents?: number;
    taxCode?: string;
    revenueCategory?: string;
    sortOrder?: number;
  }>;
}): OrderLineItem[] =>
  params.lineItems.map((item, idx) => ({
    id: item.id ?? params.idGenerator.newId(),
    description: requireValue(item.description, "description"),
    quantity: requireValue(item.quantity, "quantity"),
    unitPriceCents: requireValue(item.unitPriceCents, "unitPriceCents"),
    discountCents: item.discountCents,
    taxCode: item.taxCode,
    revenueCategory: item.revenueCategory,
    sortOrder: item.sortOrder ?? idx,
  }));
