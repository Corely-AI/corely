import type {
  ListProductsInput,
  ListInventoryDocumentsInput,
  ListStockMovesInput,
  GetOnHandInput,
  GetAvailableInput,
  ListReorderPoliciesInput,
  GetReorderSuggestionsInput,
  GetLowStockInput,
  ListLotsInput,
  GetExpirySummaryInput,
} from "@corely/contracts";

export const inventoryQueryKeys = {
  all: ["inventory"] as const,

  products: {
    all: () => [...inventoryQueryKeys.all, "products"] as const,
    lists: () => [...inventoryQueryKeys.products.all(), "list"] as const,
    list: (query?: ListProductsInput) => [...inventoryQueryKeys.products.lists(), query] as const,
    details: () => [...inventoryQueryKeys.products.all(), "detail"] as const,
    detail: (productId: string) => [...inventoryQueryKeys.products.details(), productId] as const,
  },

  warehouses: {
    all: () => [...inventoryQueryKeys.all, "warehouses"] as const,
    list: () => [...inventoryQueryKeys.warehouses.all(), "list"] as const,
    detail: (warehouseId: string) => [...inventoryQueryKeys.warehouses.all(), warehouseId] as const,
    locations: (warehouseId: string) =>
      [...inventoryQueryKeys.warehouses.all(), warehouseId, "locations"] as const,
  },

  documents: {
    all: () => [...inventoryQueryKeys.all, "documents"] as const,
    lists: () => [...inventoryQueryKeys.documents.all(), "list"] as const,
    list: (query?: ListInventoryDocumentsInput) =>
      [...inventoryQueryKeys.documents.lists(), query] as const,
    detail: (documentId: string) => [...inventoryQueryKeys.documents.all(), documentId] as const,
  },

  stock: {
    onHand: (query?: GetOnHandInput) =>
      [...inventoryQueryKeys.all, "stock", "onHand", query] as const,
    available: (query?: GetAvailableInput) =>
      [...inventoryQueryKeys.all, "stock", "available", query] as const,
    moves: (query?: ListStockMovesInput) =>
      [...inventoryQueryKeys.all, "stock", "moves", query] as const,
  },

  reorder: {
    policies: (query?: ListReorderPoliciesInput) =>
      [...inventoryQueryKeys.all, "reorder", "policies", query] as const,
    suggestions: (query?: GetReorderSuggestionsInput) =>
      [...inventoryQueryKeys.all, "reorder", "suggestions", query] as const,
    lowStock: (query?: GetLowStockInput) =>
      [...inventoryQueryKeys.all, "reorder", "low-stock", query] as const,
  },

  reports: {
    usage: (query?: { warehouseId?: string; fromDate?: string; toDate?: string }) =>
      [...inventoryQueryKeys.all, "reports", "usage", query] as const,
  },

  lots: {
    all: () => [...inventoryQueryKeys.all, "lots"] as const,
    lists: () => [...inventoryQueryKeys.lots.all(), "list"] as const,
    list: (query?: ListLotsInput) => [...inventoryQueryKeys.lots.lists(), query] as const,
    details: () => [...inventoryQueryKeys.lots.all(), "detail"] as const,
    detail: (lotId: string) => [...inventoryQueryKeys.lots.details(), lotId] as const,
    expirySummary: (query?: GetExpirySummaryInput) =>
      [...inventoryQueryKeys.lots.all(), "expiry-summary", query] as const,
  },
};
