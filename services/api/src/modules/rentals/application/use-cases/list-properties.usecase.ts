import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  type UseCaseError,
} from "@corely/kernel";
import { type ListRentalPropertiesInput, type RentalProperty } from "@corely/contracts";
import { type PropertyRepoPort } from "../ports/property-repository.port";

export class ListPropertiesUseCase extends BaseUseCase<
  ListRentalPropertiesInput,
  RentalProperty[]
> {
  constructor(private readonly useCaseDeps: { propertyRepo: PropertyRepoPort }) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: ListRentalPropertiesInput,
    ctx: UseCaseContext
  ): Promise<Result<RentalProperty[], UseCaseError>> {
    const properties = await this.useCaseDeps.propertyRepo.list(ctx.tenantId!, input);
    return ok(properties);
  }
}
