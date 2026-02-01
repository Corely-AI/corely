import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  type UseCaseError,
} from "@corely/kernel";
import { type RentalCategory } from "@corely/contracts";
import { type CategoryRepoPort } from "../ports/category-repository.port";

export class ListCategoriesUseCase extends BaseUseCase<void, RentalCategory[]> {
  constructor(private readonly useCaseDeps: { categoryRepo: CategoryRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<RentalCategory[], UseCaseError>> {
    const categories = await this.useCaseDeps.categoryRepo.list(ctx.tenantId!);
    return ok(categories);
  }
}
