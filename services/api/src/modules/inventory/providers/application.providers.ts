import { type Provider } from "@nestjs/common";
import { InventoryApplication } from "../application/inventory.application";

import { CreateProductUseCase } from "../application/use-cases/create-product.usecase";
import { UpdateProductUseCase } from "../application/use-cases/update-product.usecase";
import { ActivateProductUseCase } from "../application/use-cases/activate-product.usecase";
import { DeactivateProductUseCase } from "../application/use-cases/deactivate-product.usecase";
import { GetProductUseCase } from "../application/use-cases/get-product.usecase";
import { ListProductsUseCase } from "../application/use-cases/list-products.usecase";

import {
  CreateWarehouseUseCase,
  UpdateWarehouseUseCase,
  GetWarehouseUseCase,
  ListWarehousesUseCase,
} from "../application/use-cases/warehouses.usecases";

import {
  CreateLocationUseCase,
  UpdateLocationUseCase,
  ListLocationsUseCase,
} from "../application/use-cases/locations.usecases";

import {
  CreateInventoryDocumentUseCase,
  UpdateInventoryDocumentUseCase,
  ConfirmInventoryDocumentUseCase,
  PostInventoryDocumentUseCase,
  CancelInventoryDocumentUseCase,
  GetInventoryDocumentUseCase,
  ListInventoryDocumentsUseCase,
} from "../application/use-cases/documents.usecases";

import {
  GetOnHandUseCase,
  GetAvailableUseCase,
  ListStockMovesUseCase,
  ListReservationsUseCase,
} from "../application/use-cases/stock.usecases";

import {
  ListReorderPoliciesUseCase,
  CreateReorderPolicyUseCase,
  UpdateReorderPolicyUseCase,
  GetReorderSuggestionsUseCase,
  GetLowStockUseCase,
} from "../application/use-cases/reorder.usecases";

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
