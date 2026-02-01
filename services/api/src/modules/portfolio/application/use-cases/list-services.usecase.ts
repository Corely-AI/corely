import { Injectable, Inject } from "@nestjs/common";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import type {
  ListPortfolioServicesInput,
  ListPortfolioServicesOutput,
  FilterSpec,
} from "@corely/contracts";
import { buildPageInfo } from "../../../../shared/http/pagination";
import {
  SERVICE_REPOSITORY_PORT,
  type ServiceRepositoryPort,
} from "../ports/service-repository.port";
import {
  SHOWCASE_REPOSITORY_PORT,
  type ShowcaseRepositoryPort,
} from "../ports/showcase-repository.port";
import { toPortfolioServiceDto } from "../mappers/portfolio.mapper";
import { assertPortfolioRead } from "../../policies/portfolio-policies";
import { assertCompanyMode } from "../../domain/portfolio-rules";
import type { PortfolioContentStatus } from "../../domain/portfolio.types";

const getFilterValue = (filters: FilterSpec[] | undefined, field: string) => {
  if (!filters) {
    return undefined;
  }
  const match = filters.find((filter) => filter.field === field && filter.operator === "eq");
  return match?.value;
};

@RequireTenant()
@Injectable()
export class ListServicesUseCase extends BaseUseCase<
  ListPortfolioServicesInput & { showcaseId: string },
  ListPortfolioServicesOutput
> {
  constructor(
    @Inject(SERVICE_REPOSITORY_PORT) private readonly repo: ServiceRepositoryPort,
    @Inject(SHOWCASE_REPOSITORY_PORT) private readonly showcaseRepo: ShowcaseRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: ListPortfolioServicesInput & { showcaseId: string },
    ctx: UseCaseContext
  ): Promise<Result<ListPortfolioServicesOutput, UseCaseError>> {
    assertPortfolioRead(ctx);
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId is required"));
    }

    const showcase = await this.showcaseRepo.findById(
      ctx.tenantId!,
      ctx.workspaceId,
      input.showcaseId
    );
    if (!showcase) {
      return err(new NotFoundError("Showcase not found"));
    }

    assertCompanyMode(showcase.type);

    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 20;
    const filters = Array.isArray(input.filters) ? input.filters : undefined;
    const status = (input.status ?? getFilterValue(filters, "status")) as
      | PortfolioContentStatus
      | undefined;

    const result = await this.repo.listByShowcase(
      ctx.tenantId!,
      ctx.workspaceId,
      input.showcaseId,
      {
        q: input.q,
        status,
        sort: input.sort,
        structuredFilters: input.filters,
      },
      { page, pageSize }
    );

    return ok({
      items: result.items.map(toPortfolioServiceDto),
      pageInfo: buildPageInfo(result.total, page, pageSize),
    });
  }
}
