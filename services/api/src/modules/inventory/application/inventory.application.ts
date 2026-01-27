import type { CreateProductUseCase } from "./use-cases/create-product.usecase";
import type { UpdateProductUseCase } from "./use-cases/update-product.usecase";
import type { ActivateProductUseCase } from "./use-cases/activate-product.usecase";
import type { DeactivateProductUseCase } from "./use-cases/deactivate-product.usecase";
import type { GetProductUseCase } from "./use-cases/get-product.usecase";
import type { ListProductsUseCase } from "./use-cases/list-products.usecase";
import type { CreateWarehouseUseCase } from "./use-cases/create-warehouse.usecase";
import type { UpdateWarehouseUseCase } from "./use-cases/update-warehouse.usecase";
import type { GetWarehouseUseCase } from "./use-cases/get-warehouse.usecase";
import type { ListWarehousesUseCase } from "./use-cases/list-warehouses.usecase";
import type { CreateLocationUseCase } from "./use-cases/create-location.usecase";
import type { UpdateLocationUseCase } from "./use-cases/update-location.usecase";
import type { ListLocationsUseCase } from "./use-cases/list-locations.usecase";
import type { CreateInventoryDocumentUseCase } from "./use-cases/create-inventory-document.usecase";
import type { UpdateInventoryDocumentUseCase } from "./use-cases/update-inventory-document.usecase";
import type { ConfirmInventoryDocumentUseCase } from "./use-cases/confirm-inventory-document.usecase";
import type { PostInventoryDocumentUseCase } from "./use-cases/post-inventory-document.usecase";
import type { CancelInventoryDocumentUseCase } from "./use-cases/cancel-inventory-document.usecase";
import type { GetInventoryDocumentUseCase } from "./use-cases/get-inventory-document.usecase";
import type { ListInventoryDocumentsUseCase } from "./use-cases/list-inventory-documents.usecase";
import type { GetOnHandUseCase } from "./use-cases/get-on-hand.usecase";
import type { GetAvailableUseCase } from "./use-cases/get-available.usecase";
import type { ListStockMovesUseCase } from "./use-cases/list-stock-moves.usecase";
import type { ListReservationsUseCase } from "./use-cases/list-reservations.usecase";
import type { ListReorderPoliciesUseCase } from "./use-cases/list-reorder-policies.usecase";
import type { CreateReorderPolicyUseCase } from "./use-cases/create-reorder-policy.usecase";
import type { UpdateReorderPolicyUseCase } from "./use-cases/update-reorder-policy.usecase";
import type { GetReorderSuggestionsUseCase } from "./use-cases/get-reorder-suggestions.usecase";
import type { GetLowStockUseCase } from "./use-cases/get-low-stock.usecase";

export class InventoryApplication {
  constructor(
    // Products
    public readonly createProduct: CreateProductUseCase,
    public readonly updateProduct: UpdateProductUseCase,
    public readonly activateProduct: ActivateProductUseCase,
    public readonly deactivateProduct: DeactivateProductUseCase,
    public readonly getProduct: GetProductUseCase,
    public readonly listProducts: ListProductsUseCase,
    // Warehouses
    public readonly createWarehouse: CreateWarehouseUseCase,
    public readonly updateWarehouse: UpdateWarehouseUseCase,
    public readonly getWarehouse: GetWarehouseUseCase,
    public readonly listWarehouses: ListWarehousesUseCase,
    // Locations
    public readonly createLocation: CreateLocationUseCase,
    public readonly updateLocation: UpdateLocationUseCase,
    public readonly listLocations: ListLocationsUseCase,
    // Documents
    public readonly createDocument: CreateInventoryDocumentUseCase,
    public readonly updateDocument: UpdateInventoryDocumentUseCase,
    public readonly confirmDocument: ConfirmInventoryDocumentUseCase,
    public readonly postDocument: PostInventoryDocumentUseCase,
    public readonly cancelDocument: CancelInventoryDocumentUseCase,
    public readonly getDocument: GetInventoryDocumentUseCase,
    public readonly listDocuments: ListInventoryDocumentsUseCase,
    // Stock
    public readonly getOnHand: GetOnHandUseCase,
    public readonly getAvailable: GetAvailableUseCase,
    public readonly listStockMoves: ListStockMovesUseCase,
    public readonly listReservations: ListReservationsUseCase,
    // Reorder
    public readonly listReorderPolicies: ListReorderPoliciesUseCase,
    public readonly createReorderPolicy: CreateReorderPolicyUseCase,
    public readonly updateReorderPolicy: UpdateReorderPolicyUseCase,
    public readonly getReorderSuggestions: GetReorderSuggestionsUseCase,
    public readonly getLowStock: GetLowStockUseCase
  ) {}
}
