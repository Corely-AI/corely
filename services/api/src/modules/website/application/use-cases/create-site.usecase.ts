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
import { normalizeLocale, normalizeWebsiteSlug } from "../../domain/website.validators";

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
    if (!input.slug?.trim()) {
      throw new ValidationError("slug is required", undefined, "Website:InvalidSlug");
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
    const slug = normalizeWebsiteSlug(input.slug);

    const existingSlug = await this.deps.siteRepo.findBySlug(ctx.tenantId, slug);
    if (existingSlug) {
      return err(new ValidationError("slug is already in use", undefined, "Website:SlugTaken"));
    }

    const existingDefault = await this.deps.siteRepo.findDefaultByTenant(ctx.tenantId);
    const shouldDefault = input.isDefault ?? !existingDefault;

    const site: WebsiteSite = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      name: input.name.trim(),
      slug,
      defaultLocale: normalizeLocale(input.defaultLocale),
      brandingJson: input.brandingJson ?? null,
      themeJson: input.themeJson ?? null,
      isDefault: shouldDefault,
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.deps.siteRepo.create(site);

    if (shouldDefault) {
      await this.deps.siteRepo.setDefault(ctx.tenantId, created.id);
      const refreshed = await this.deps.siteRepo.findById(ctx.tenantId, created.id);
      return ok(refreshed ?? { ...created, isDefault: true });
    }

    return ok(created);
  }
}
