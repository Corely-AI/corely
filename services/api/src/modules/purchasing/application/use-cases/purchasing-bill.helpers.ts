import { type IdGeneratorPort } from "@corely/kernel";
import type { VendorBillLineItem } from "../../domain/purchasing.types";

export const buildLineItems = (params: {
  idGenerator: IdGeneratorPort;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitCostCents: number;
    category?: string;
    glAccountId?: string;
    taxCode?: string;
    sortOrder?: number;
  }>;
}): VendorBillLineItem[] =>
  params.lineItems.map((item, idx) => ({
    id: item.id ?? params.idGenerator.newId(),
    description: item.description,
    quantity: item.quantity,
    unitCostCents: item.unitCostCents,
    category: item.category,
    glAccountId: item.glAccountId,
    taxCode: item.taxCode,
    sortOrder: item.sortOrder ?? idx,
  }));
