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
import type { AccountRepositoryPort } from "../../ports/account-repository.port";
import { ACCOUNT_REPO_PORT } from "../../ports/account-repository.port";
import type {
  CustomFieldsWritePort,
  DimensionsWritePort,
} from "../../../../platform-custom-attributes/application/ports/custom-attributes.ports";
import {
  CUSTOM_FIELDS_WRITE_PORT,
  DIMENSIONS_WRITE_PORT,
} from "../../../../platform-custom-attributes/application/ports/custom-attributes.ports";

export interface SetAccountCustomAttributesInput {
  id: string;
  customFieldValues: Record<string, unknown>;
  dimensionAssignments: Array<{ typeId: string; valueIds: string[] }>;
}

@Injectable()
@RequireTenant()
export class SetAccountCustomAttributesUseCase extends BaseUseCase<
  SetAccountCustomAttributesInput,
  { ok: true }
> {
  constructor(
    @Inject(ACCOUNT_REPO_PORT) private readonly accountRepo: AccountRepositoryPort,
    @Inject(CUSTOM_FIELDS_WRITE_PORT) private readonly customFieldsWrite: CustomFieldsWritePort,
    @Inject(DIMENSIONS_WRITE_PORT) private readonly dimensionsWrite: DimensionsWritePort
  ) {
    super({});
  }

  protected async handle(
    input: SetAccountCustomAttributesInput,
    ctx: UseCaseContext
  ): Promise<Result<{ ok: true }, UseCaseError>> {
    const account = await this.accountRepo.findById(ctx.tenantId, input.id);
    if (!account) {
      return err(new NotFoundError("Account not found"));
    }

    if (Object.keys(input.customFieldValues).length > 0) {
      await this.customFieldsWrite.setEntityValues(
        ctx.tenantId,
        "party",
        account.partyId,
        input.customFieldValues
      );
    }

    if (input.dimensionAssignments.length > 0) {
      await this.dimensionsWrite.setEntityAssignments(
        ctx.tenantId,
        "party",
        account.partyId,
        input.dimensionAssignments
      );
    }

    return ok({ ok: true });
  }
}
