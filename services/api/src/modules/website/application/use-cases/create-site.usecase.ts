import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type { CreateWebsiteSiteInput, WebsiteSite } from "@corely/contracts";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { IdGeneratorPort } from "@shared/ports/id-generator.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeLocale } from "../../domain/website.validators";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

@RequireTenant()
export class CreateWebsiteSiteUseCase extends BaseUseCase<CreateWebsiteSiteInput, WebsiteSite> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected validate(input: CreateWebsiteSiteInput): CreateWebsiteSiteInput {
    if (!input.name?.trim()) {
      throw new ValidationError("name is required", undefined, "Website:InvalidName");
    }
    if (!input.defaultLocale?.trim()) {
      throw new ValidationError("defaultLocale is required", undefined, "Website:InvalidLocale");
    }
    return input;
  }

  protected async handle(
    input: CreateWebsiteSiteInput,
    ctx: UseCaseContext
  ): Promise<Result<WebsiteSite, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const now = this.deps.clock.now().toISOString();
    const site: WebsiteSite = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      name: input.name.trim(),
      defaultLocale: normalizeLocale(input.defaultLocale),
      brandingJson: input.brandingJson ?? null,
      themeJson: input.themeJson ?? null,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.deps.siteRepo.create(site);
    return ok(created);
  }
}
