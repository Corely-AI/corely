import { BaseUseCase, type UseCaseContext, type Result, ok, type UseCaseError } from "@corely/kernel";
import { type ListPublicRentalPropertiesInput, type RentalProperty } from "@corely/contracts";
import { type PropertyRepoPort } from "../ports/property-repository.port";

export class ListPublicPropertiesUseCase extends BaseUseCase<
  ListPublicRentalPropertiesInput,
  RentalProperty[]
> {
  constructor(private readonly useCaseDeps: { propertyRepo: PropertyRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: ListPublicRentalPropertiesInput,
    ctx: UseCaseContext
  ): Promise<Result<RentalProperty[], UseCaseError>> {
    const properties = await this.useCaseDeps.propertyRepo.listPublic(input);
    return ok(properties);
  }
}
