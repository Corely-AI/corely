import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import type { UpdateWebsiteQaInput, UpsertWebsiteQaOutput } from "@corely/contracts";
import type { ClockPort } from "@/shared/ports/clock.port";
import type { WebsiteQaRepositoryPort } from "../ports/qa-repository.port";

type Deps = {
  logger: LoggerPort;
  qaRepo: WebsiteQaRepositoryPort;
  clock: ClockPort;
};

@RequireTenant()
export class UpdateWebsiteQaUseCase extends BaseUseCase<
  { siteId: string; qaId: string; input: UpdateWebsiteQaInput },
  UpsertWebsiteQaOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    params: { siteId: string; qaId: string; input: UpdateWebsiteQaInput },
    ctx: UseCaseContext
  ): Promise<Result<UpsertWebsiteQaOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const existing = await this.deps.qaRepo.findById(ctx.tenantId, params.siteId, params.qaId);
    if (!existing) {
      return err(new NotFoundError("Q&A item not found", undefined, "Website:QaNotFound"));
    }

    const input = params.input;
    const scope = input.scope ?? existing.scope;

    const item = await this.deps.qaRepo.update({
      ...existing,
      locale: input.locale ?? existing.locale,
      scope,
      pageId:
        scope === "page"
          ? input.pageId === undefined
            ? (existing.pageId ?? null)
            : input.pageId
          : null,
      status: input.status ?? existing.status,
      order: input.order ?? existing.order,
      question: input.question ?? existing.question,
      answerHtml: input.answerHtml ?? existing.answerHtml,
      updatedAt: this.deps.clock.now().toISOString(),
    });

    return ok({ item });
  }
}
