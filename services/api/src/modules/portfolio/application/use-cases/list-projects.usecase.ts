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
import type {
  ListPortfolioProjectsInput,
  ListPortfolioProjectsOutput,
  FilterSpec,
} from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import {
  PROJECT_REPOSITORY_PORT,
  type ProjectRepositoryPort,
} from "../ports/project-repository.port";
import { toPortfolioProjectDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";
import type { PortfolioContentStatus, PortfolioProjectType } from "../../domain/portfolio.types";

const getFilterValue = (filters: FilterSpec[] | undefined, field: string) => {
  if (!filters) {
    return undefined;
  }
  const match = filters.find((filter) => filter.field === field && filter.operator === "eq");
  return match?.value;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
  }
  return undefined;
};

@RequireTenant()
@Injectable()
export class ListProjectsUseCase extends BaseUseCase<
  ListPortfolioProjectsInput & { showcaseId: string },
  ListPortfolioProjectsOutput
> {
  constructor(@Inject(PROJECT_REPOSITORY_PORT) private readonly repo: ProjectRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: ListPortfolioProjectsInput & { showcaseId: string },
    ctx: UseCaseContext
  ): Promise<Result<ListPortfolioProjectsOutput, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const filters = Array.isArray(input.filters) ? input.filters : undefined;

    const status = (input.status ?? getFilterValue(filters, "status")) as
      | PortfolioContentStatus
      | undefined;
    const type = (input.type ?? getFilterValue(filters, "type")) as
      | PortfolioProjectType
      | undefined;
    const featured = toBoolean(input.featured ?? getFilterValue(filters, "featured"));

    const result = await this.repo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      input.showcaseId,
      {
        q: input.q,
        status,
        type,
        featured,
        sort: input.sort,
        structuredFilters: input.filters,
      },
      { page, pageSize }
    );

    return ok({
      items: result.items.map(toPortfolioProjectDto),
      pageInfo: buildPageInfo(result.total, page, pageSize),
    });
  }
}
