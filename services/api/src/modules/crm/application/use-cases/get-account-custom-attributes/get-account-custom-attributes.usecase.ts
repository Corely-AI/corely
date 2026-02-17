import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { AccountCustomAttributes } from "@corely/contracts";
import type { AccountRepositoryPort } from "../../ports/account-repository.port";
import { ACCOUNT_REPO_PORT } from "../../ports/account-repository.port";
import type {
  CustomFieldsReadPort,
  DimensionsReadPort,
} from "../../../../platform-custom-attributes/application/ports/custom-attributes.ports";
import {
  CUSTOM_FIELDS_READ_PORT,
  DIMENSIONS_READ_PORT,
} from "../../../../platform-custom-attributes/application/ports/custom-attributes.ports";

type GetAccountCustomAttributesInput = {
  id: string;
};

@Injectable()
@RequireTenant()
export class GetAccountCustomAttributesUseCase extends BaseUseCase<
  GetAccountCustomAttributesInput,
  AccountCustomAttributes
> {
  constructor(
    @Inject(ACCOUNT_REPO_PORT) private readonly accountRepo: AccountRepositoryPort,
    @Inject(CUSTOM_FIELDS_READ_PORT) private readonly customFieldsRead: CustomFieldsReadPort,
    @Inject(DIMENSIONS_READ_PORT) private readonly dimensionsRead: DimensionsReadPort
  ) {
    super({});
  }

  protected async handle(
    input: GetAccountCustomAttributesInput,
    ctx: UseCaseContext
  ): Promise<Result<AccountCustomAttributes, UseCaseError>> {
    const account = await this.accountRepo.findById(ctx.tenantId, input.id);
    if (!account) {
      return err(new NotFoundError("Account not found"));
    }

    const [customFieldValues, dimensions] = await Promise.all([
      this.customFieldsRead.getEntityValues(ctx.tenantId, "party", account.partyId),
      this.dimensionsRead.getEntityAssignments(ctx.tenantId, "party", account.partyId),
    ]);

    return ok({
      customFieldValues,
      dimensionAssignments: dimensions.assignments ?? [],
    });
  }
}
