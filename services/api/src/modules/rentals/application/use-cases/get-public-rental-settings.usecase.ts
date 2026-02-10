import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  err,
  ValidationError,
  type UseCaseError,
} from "@corely/kernel";
import type { GetRentalContactSettingsOutput, RentalContactSettings } from "@corely/contracts";
import { assertPublicModuleEnabled } from "../../../../shared/public";
import type { RentalSettingsRepositoryPort } from "../ports/settings-repository.port";

const DEFAULT_RENTAL_CONTACT_SETTINGS: RentalContactSettings = {
  hostContactMethod: null,
  hostContactEmail: null,
  hostContactPhone: null,
};

export class GetPublicRentalSettingsUseCase extends BaseUseCase<
  void,
  GetRentalContactSettingsOutput
> {
  constructor(
    private readonly useCaseDeps: {
      settingsRepo: RentalSettingsRepositoryPort;
    }
  ) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    _input: void,
    ctx: UseCaseContext
  ): Promise<Result<GetRentalContactSettingsOutput, UseCaseError>> {
    const publishError = assertPublicModuleEnabled(ctx, "rentals");
    if (publishError) {
      return err(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const settings = await this.useCaseDeps.settingsRepo.getSettings(ctx.tenantId, ctx.workspaceId);
    return ok({ settings: settings ?? DEFAULT_RENTAL_CONTACT_SETTINGS });
  }
}
