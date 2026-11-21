import { Injectable } from "@nestjs/common";
import type { UseCaseContext } from "@corely/kernel";
import { SignAccessService } from "../services/sign-access.service";
import { SignConfiguration } from "../ports/sign-configuration";

@Injectable()
export class GetSignSettingsUseCase {
  constructor(
    private readonly auth: SignAccessService,
    private readonly configuration: SignConfiguration
  ) {}

  async execute(ctx: UseCaseContext) {
    await this.auth.authorize(ctx, undefined, ["sign.settings.read"]);
    return this.configuration.describe();
  }
}
