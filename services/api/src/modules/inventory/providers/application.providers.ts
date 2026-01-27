import { type Provider } from "@nestjs/common";
import { InventoryApplication } from "../application/inventory.application";

import { CreateProductUseCase } from "../application/use-cases/create-product.usecase";
import { UpdateProductUseCase } from "../application/use-cases/update-product.usecase";
import { ActivateProductUseCase } from "../application/use-cases/activate-product.usecase";
import { DeactivateProductUseCase } from "../application/use-cases/deactivate-product.usecase";
import { GetProductUseCase } from "../application/use-cases/get-product.usecase";
import { ListProductsUseCase } from "../application/use-cases/list-products.usecase";

import { CreateWarehouseUseCase } from "../application/use-cases/create-warehouse.usecase";
import { UpdateWarehouseUseCase } from "../application/use-cases/update-warehouse.usecase";
import { GetWarehouseUseCase } from "../application/use-cases/get-warehouse.usecase";
import { ListWarehousesUseCase } from "../application/use-cases/list-warehouses.usecase";

import { CreateLocationUseCase } from "../application/use-cases/create-location.usecase";
import { UpdateLocationUseCase } from "../application/use-cases/update-location.usecase";
import { ListLocationsUseCase } from "../application/use-cases/list-locations.usecase";

import { CreateInventoryDocumentUseCase } from "../application/use-cases/create-inventory-document.usecase";
import { UpdateInventoryDocumentUseCase } from "../application/use-cases/update-inventory-document.usecase";
import { ConfirmInventoryDocumentUseCase } from "../application/use-cases/confirm-inventory-document.usecase";
import { PostInventoryDocumentUseCase } from "../application/use-cases/post-inventory-document.usecase";
import { CancelInventoryDocumentUseCase } from "../application/use-cases/cancel-inventory-document.usecase";
import { GetInventoryDocumentUseCase } from "../application/use-cases/get-inventory-document.usecase";
import { ListInventoryDocumentsUseCase } from "../application/use-cases/list-inventory-documents.usecase";

import { GetOnHandUseCase } from "../application/use-cases/get-on-hand.usecase";
import { GetAvailableUseCase } from "../application/use-cases/get-available.usecase";
import { ListStockMovesUseCase } from "../application/use-cases/list-stock-moves.usecase";
import { ListReservationsUseCase } from "../application/use-cases/list-reservations.usecase";

import { ListReorderPoliciesUseCase } from "../application/use-cases/list-reorder-policies.usecase";
import { CreateReorderPolicyUseCase } from "../application/use-cases/create-reorder-policy.usecase";
import { UpdateReorderPolicyUseCase } from "../application/use-cases/update-reorder-policy.usecase";
import { GetReorderSuggestionsUseCase } from "../application/use-cases/get-reorder-suggestions.usecase";
import { GetLowStockUseCase } from "../application/use-cases/get-low-stock.usecase";

export const applicationProviders: Provider[] = [
  {
    provide: InventoryApplication,
    useFactory: (
      // Products
      createProduct: CreateProductUseCase,
      updateProduct: UpdateProductUseCase,
      activateProduct: ActivateProductUseCase,
      deactivateProduct: DeactivateProductUseCase,
      getProduct: GetProductUseCase,
      listProducts: ListProductsUseCase,
      // Warehouses
      createWarehouse: CreateWarehouseUseCase,
      updateWarehouse: UpdateWarehouseUseCase,
      getWarehouse: GetWarehouseUseCase,
      listWarehouses: ListWarehousesUseCase,
      // Locations
      createLocation: CreateLocationUseCase,
      updateLocation: UpdateLocationUseCase,
      listLocations: ListLocationsUseCase,
      // Documents
      createDocument: CreateInventoryDocumentUseCase,
      updateDocument: UpdateInventoryDocumentUseCase,
      confirmDocument: ConfirmInventoryDocumentUseCase,
      postDocument: PostInventoryDocumentUseCase,
      cancelDocument: CancelInventoryDocumentUseCase,
      getDocument: GetInventoryDocumentUseCase,
      listDocuments: ListInventoryDocumentsUseCase,
      // Stock
      getOnHand: GetOnHandUseCase,
      getAvailable: GetAvailableUseCase,
      listStockMoves: ListStockMovesUseCase,
      listReservations: ListReservationsUseCase,
      // Reorder
      listReorderPolicies: ListReorderPoliciesUseCase,
      createReorderPolicy: CreateReorderPolicyUseCase,
      updateReorderPolicy: UpdateReorderPolicyUseCase,
      getReorderSuggestions: GetReorderSuggestionsUseCase,
      getLowStock: GetLowStockUseCase
    ) =>
      new InventoryApplication(
        createProduct,
        updateProduct,
        activateProduct,
        deactivateProduct,
        getProduct,
        listProducts,
        createWarehouse,
        updateWarehouse,
        getWarehouse,
        listWarehouses,
        createLocation,
        updateLocation,
        listLocations,
        createDocument,
        updateDocument,
        confirmDocument,
        postDocument,
        cancelDocument,
        getDocument,
        listDocuments,
        getOnHand,
        getAvailable,
        listStockMoves,
        listReservations,
        listReorderPolicies,
        createReorderPolicy,
        updateReorderPolicy,
        getReorderSuggestions,
        getLowStock
      ),
    inject: [
      CreateProductUseCase,
      UpdateProductUseCase,
      ActivateProductUseCase,
      DeactivateProductUseCase,
      GetProductUseCase,
      ListProductsUseCase,
      CreateWarehouseUseCase,
      UpdateWarehouseUseCase,
      GetWarehouseUseCase,
      ListWarehousesUseCase,
      CreateLocationUseCase,
      UpdateLocationUseCase,
      ListLocationsUseCase,
      CreateInventoryDocumentUseCase,
      UpdateInventoryDocumentUseCase,
      ConfirmInventoryDocumentUseCase,
      PostInventoryDocumentUseCase,
      CancelInventoryDocumentUseCase,
      GetInventoryDocumentUseCase,
      ListInventoryDocumentsUseCase,
      GetOnHandUseCase,
      GetAvailableUseCase,
      ListStockMovesUseCase,
      ListReservationsUseCase,
      ListReorderPoliciesUseCase,
      CreateReorderPolicyUseCase,
      UpdateReorderPolicyUseCase,
      GetReorderSuggestionsUseCase,
      GetLowStockUseCase,
    ],
  },
];
