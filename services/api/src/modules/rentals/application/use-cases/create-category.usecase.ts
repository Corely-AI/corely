import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  ValidationError,
  type UseCaseError,
} from "@corely/kernel";
import { type CreateRentalCategoryInput, type RentalCategory } from "@corely/contracts";
import { type CategoryRepoPort } from "../ports/category-repository.port";

export class CreateCategoryUseCase extends BaseUseCase<CreateRentalCategoryInput, RentalCategory> {
  constructor(private readonly useCaseDeps: { categoryRepo: CategoryRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: CreateRentalCategoryInput,
    ctx: UseCaseContext
  ): Promise<Result<RentalCategory, UseCaseError>> {
    const existing = await this.useCaseDeps.categoryRepo.findBySlug(ctx.tenantId!, input.slug);
    if (existing) {
      return err(new ValidationError("Category with this slug already exists"));
    }

    const category = await this.useCaseDeps.categoryRepo.save(
      ctx.tenantId!,
      ctx.workspaceId!,
      input
    );
    return ok(category);
  }
}
