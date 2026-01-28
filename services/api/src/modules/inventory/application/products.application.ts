import type { CreateProductUseCase } from "./use-cases/create-product.usecase";
import type { UpdateProductUseCase } from "./use-cases/update-product.usecase";
import type { ActivateProductUseCase } from "./use-cases/activate-product.usecase";
import type { DeactivateProductUseCase } from "./use-cases/deactivate-product.usecase";
import type { GetProductUseCase } from "./use-cases/get-product.usecase";
import type { ListProductsUseCase } from "./use-cases/list-products.usecase";

export class ProductsApplication {
  constructor(
    public readonly createProduct: CreateProductUseCase,
    public readonly updateProduct: UpdateProductUseCase,
    public readonly activateProduct: ActivateProductUseCase,
    public readonly deactivateProduct: DeactivateProductUseCase,
    public readonly getProduct: GetProductUseCase,
    public readonly listProducts: ListProductsUseCase
  ) {}
}
