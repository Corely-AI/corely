import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  ValidationError,
  NotFoundError,
  type UseCaseError,
} from "@corely/kernel";
import { type UpdateRentalCategoryInput, type RentalCategory } from "@corely/contracts";
import { type CategoryRepoPort } from "../ports/category-repository.port";

export class UpdateCategoryUseCase extends BaseUseCase<UpdateRentalCategoryInput, RentalCategory> {
  constructor(private readonly useCaseDeps: { categoryRepo: CategoryRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: UpdateRentalCategoryInput,
    ctx: UseCaseContext
  ): Promise<Result<RentalCategory, UseCaseError>> {
    if (!input.name || !input.slug) {
      return err(new ValidationError("name and slug are required"));
    }

    const category = await this.useCaseDeps.categoryRepo.findById(ctx.tenantId!, input.id);
    if (!category) {
      return err(new NotFoundError("Category not found"));
    }

    if (input.slug !== category.slug) {
      const existing = await this.useCaseDeps.categoryRepo.findBySlug(ctx.tenantId!, input.slug);
      if (existing) {
        return err(new ValidationError("Category with this slug already exists"));
      }
    }

    const updated = await this.useCaseDeps.categoryRepo.save(ctx.tenantId!, ctx.workspaceId!, {
      ...input,
      name: input.name,
      slug: input.slug,
    });
    return ok(updated);
  }
}
