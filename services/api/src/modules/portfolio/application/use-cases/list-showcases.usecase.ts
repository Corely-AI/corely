import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type { ListPortfolioShowcasesInput, ListPortfolioShowcasesOutput } from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioShowcaseDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";

@RequireTenant()
@Injectable()
export class ListShowcasesUseCase extends BaseUseCase<
  ListPortfolioShowcasesInput,
  ListPortfolioShowcasesOutput
> {
  constructor(@Inject(SHOWCASE_REPOSITORY_PORT) private readonly repo: ShowcaseRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: ListPortfolioShowcasesInput,
    ctx: UseCaseContext
  ): Promise<Result<ListPortfolioShowcasesOutput, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    const result = await this.repo.list(
      ctx.tenantId!,
      ctx.workspaceId,
      {
        q: input.q,
        type: input.type,
        isPublished: input.isPublished,
        sort: input.sort,
        structuredFilters: input.filters,
      },
      { page, pageSize }
    );

    return ok({
      items: result.items.map(toPortfolioShowcaseDto),
      pageInfo: buildPageInfo(result.total, page, pageSize),
    });
  }
}
