import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  NotFoundError,
  ValidationError,
  ok,
  err,
  RequireTenant,
  type OutboxPort,
  type UnitOfWorkPort,
} from "@corely/kernel";
import type { UnpublishWebsitePageOutput, WebsitePage } from "@corely/contracts";
import type { WebsitePageRepositoryPort } from "../ports/page-repository.port";
import type { ClockPort } from "@shared/ports/clock.port";

type Deps = {
  logger: LoggerPort;
  pageRepo: WebsitePageRepositoryPort;
  outbox: OutboxPort;
  uow: UnitOfWorkPort;
  clock: ClockPort;
};

@RequireTenant()
export class UnpublishWebsitePageUseCase extends BaseUseCase<
  { pageId: string },
  UnpublishWebsitePageOutput
> {
  constructor(private readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: { pageId: string },
    ctx: UseCaseContext
  ): Promise<Result<UnpublishWebsitePageOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required", undefined, "Website:TenantRequired"));
    }

    const page = await this.deps.pageRepo.findById(ctx.tenantId, input.pageId);
    if (!page) {
      return err(new NotFoundError("Page not found", undefined, "Website:PageNotFound"));
    }

    const now = this.deps.clock.now().toISOString();

    return this.deps.uow.withinTransaction(async (tx) => {
      const updated: WebsitePage = {
        ...page,
        status: "DRAFT",
        publishedAt: null,
        updatedAt: now,
      };

      const saved = await this.deps.pageRepo.update(updated, tx);

      await this.deps.outbox.enqueue(
        {
          tenantId: ctx.tenantId!,
          eventType: "website.page.unpublished",
          payload: {
            tenantId: ctx.tenantId!,
            siteId: page.siteId,
            pageId: page.id,
            path: page.path,
            locale: page.locale,
            unpublishedAt: now,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      return ok({ page: saved });
    });
  }
}
