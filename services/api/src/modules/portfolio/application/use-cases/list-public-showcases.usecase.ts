import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
} from "@corely/kernel";
import type {
  PublicPortfolioShowcaseListInput,
  PublicPortfolioShowcasesOutput,
} from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import { assertPublicModuleEnabled } from "../../../../shared/public";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioShowcaseDto } from "../mappers/portfolio.mapper";

@Injectable()
export class ListPublicShowcasesUseCase extends BaseUseCase<
  PublicPortfolioShowcaseListInput,
  PublicPortfolioShowcasesOutput
> {
  constructor(@Inject(SHOWCASE_REPOSITORY_PORT) private readonly repo: ShowcaseRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: PublicPortfolioShowcaseListInput,
    ctx: UseCaseContext
  ): Promise<Result<PublicPortfolioShowcasesOutput, UseCaseError>> {
    const publishError = assertPublicModuleEnabled(ctx, "portfolio");
    if (publishError) {
      return err(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;

    const result = await this.repo.list(
      ctx.tenantId,
      ctx.workspaceId,
      {
        q: input.q,
        type: input.type,
        isPublished: true,
      },
      { page, pageSize }
    );

    return ok({
      items: result.items.map(toPortfolioShowcaseDto),
      pageInfo: buildPageInfo(result.total, page, pageSize),
    });
  }
}
