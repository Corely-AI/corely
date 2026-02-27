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
import type { CreateWebsiteQaInput, UpsertWebsiteQaOutput } from "@corely/contracts";
import type { IdGeneratorPort } from "@/shared/ports/id-generator.port";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { WebsiteSiteRepositoryPort } from "../ports/site-repository.port";
import type { WebsiteQaRepositoryPort } from "../ports/qa-repository.port";

type Deps = {
  logger: LoggerPort;
  siteRepo: WebsiteSiteRepositoryPort;
  qaRepo: WebsiteQaRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

@RequireTenant()
export class CreateWebsiteQaUseCase extends BaseUseCase<
  CreateWebsiteQaInput,
  UpsertWebsiteQaOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: CreateWebsiteQaInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertWebsiteQaOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const site = await this.deps.siteRepo.findById(ctx.tenantId, input.siteId);
    if (!site) {
      return err(new ValidationError("site not found", undefined, "Website:SiteNotFound"));
    }

    const now = this.deps.clock.now().toISOString();
    const item = await this.deps.qaRepo.create({
      id: this.deps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      siteId: input.siteId,
      locale: input.locale,
      scope: input.scope,
      pageId: input.scope === "page" ? (input.pageId ?? null) : null,
      status: input.status,
      order: input.order,
      question: input.question,
      answerHtml: input.answerHtml,
      createdAt: now,
      updatedAt: now,
    });

    return ok({ item });
  }
}
