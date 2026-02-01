import { type IdGeneratorPort } from "@corely/kernel";
import type { PurchaseOrderLineItem } from "../../domain/purchasing.types";

export const buildLineItems = (params: {
  idGenerator: IdGeneratorPort;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitCostCents: number;
    taxCode?: string;
    category?: string;
    sortOrder?: number;
  }>;
}): PurchaseOrderLineItem[] =>
  params.lineItems.map((item, idx) => ({
    id: item.id ?? params.idGenerator.newId(),
    description: item.description,
    quantity: item.quantity,
    unitCostCents: item.unitCostCents,
    taxCode: item.taxCode,
    category: item.category,
    sortOrder: item.sortOrder ?? idx,
  }));
