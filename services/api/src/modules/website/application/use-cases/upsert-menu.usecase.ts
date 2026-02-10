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
import type {
  UpsertWebsiteMenuInput,
  UpsertWebsiteMenuOutput,
  WebsiteMenu,
} from "@corely/contracts";
import type { WebsiteMenuRepositoryPort } from "../ports/menu-repository.port";
import type { IdGeneratorPort } from "@shared/ports/id-generator.port";
import type { ClockPort } from "@shared/ports/clock.port";
import { normalizeLocale } from "../../domain/website.validators";

type Deps = {
  logger: LoggerPort;
  menuRepo: WebsiteMenuRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

@RequireTenant()
export class UpsertWebsiteMenuUseCase extends BaseUseCase<
  UpsertWebsiteMenuInput,
  UpsertWebsiteMenuOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: UpsertWebsiteMenuInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertWebsiteMenuOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const now = this.deps.clock.now().toISOString();
    const menu: WebsiteMenu = {
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      siteId: input.siteId,
      name: input.name.trim(),
      locale: normalizeLocale(input.locale),
      itemsJson: input.itemsJson ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const saved = await this.deps.menuRepo.upsert(menu);
    return ok({ menu: saved });
  }
}
