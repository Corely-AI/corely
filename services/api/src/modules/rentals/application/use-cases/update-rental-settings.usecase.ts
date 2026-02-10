import {
  BaseUseCase,
  type UseCaseContext,
  type Result,
  ok,
  ValidationError,
  type UseCaseError,
} from "@corely/kernel";
import type {
  RentalContactSettings,
  UpdateRentalContactSettingsInput,
  UpdateRentalContactSettingsOutput,
} from "@corely/contracts";
import type { RentalSettingsRepositoryPort } from "../ports/settings-repository.port";

const DEFAULT_RENTAL_CONTACT_SETTINGS: RentalContactSettings = {
  hostContactMethod: null,
  hostContactEmail: null,
  hostContactPhone: null,
};

const normalizeText = (value: string | null | undefined): string | null => {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class UpdateRentalSettingsUseCase extends BaseUseCase<
  UpdateRentalContactSettingsInput,
  UpdateRentalContactSettingsOutput
> {
  constructor(
    private readonly useCaseDeps: {
      settingsRepo: RentalSettingsRepositoryPort;
    }
  ) {
    super({ logger: (useCaseDeps as any).logger });
  }

  protected async handle(
    input: UpdateRentalContactSettingsInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateRentalContactSettingsOutput, UseCaseError>> {
    const current =
      (await this.useCaseDeps.settingsRepo.getSettings(ctx.tenantId!, ctx.workspaceId!)) ??
      DEFAULT_RENTAL_CONTACT_SETTINGS;

    const hostContactMethod =
      input.hostContactMethod === undefined ? current.hostContactMethod : input.hostContactMethod;
    const hostContactEmail =
      input.hostContactEmail === undefined
        ? normalizeText(current.hostContactEmail)
        : normalizeText(input.hostContactEmail);
    const hostContactPhone =
      input.hostContactPhone === undefined
        ? normalizeText(current.hostContactPhone)
        : normalizeText(input.hostContactPhone);

    if (hostContactMethod === "EMAIL" && !hostContactEmail) {
      throw new ValidationError("hostContactEmail is required when hostContactMethod is EMAIL.");
    }
    if (hostContactMethod === "PHONE" && !hostContactPhone) {
      throw new ValidationError("hostContactPhone is required when hostContactMethod is PHONE.");
    }

    const next: RentalContactSettings =
      hostContactMethod === "EMAIL"
        ? {
            hostContactMethod: "EMAIL",
            hostContactEmail,
            hostContactPhone: null,
          }
        : hostContactMethod === "PHONE"
          ? {
              hostContactMethod: "PHONE",
              hostContactEmail: null,
              hostContactPhone,
            }
          : {
              hostContactMethod: null,
              hostContactEmail: null,
              hostContactPhone: null,
            };

    await this.useCaseDeps.settingsRepo.saveSettings(ctx.tenantId!, ctx.workspaceId!, next);
    return ok({ settings: next });
  }
}
