import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  NotFoundError,
  type UseCaseError,
} from "@corely/kernel";
import { type CategoryRepoPort } from "../ports/category-repository.port";

export class DeleteCategoryUseCase extends BaseUseCase<string, void> {
  constructor(private readonly useCaseDeps: { categoryRepo: CategoryRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(id: string, ctx: UseCaseContext): Promise<Result<void, UseCaseError>> {
    const category = await this.useCaseDeps.categoryRepo.findById(ctx.tenantId!, id);
    if (!category) {
      return err(new NotFoundError("Category not found"));
    }

    await this.useCaseDeps.categoryRepo.delete(ctx.tenantId!, id);
    return ok(undefined);
  }
}
