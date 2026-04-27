import { Inject, Injectable } from "@nestjs/common";
import type { ListPosTransactionsInput, ListPosTransactionsOutput } from "@corely/contracts";
import {
  BaseUseCase,
  NoopLogger,
  RequireTenant,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import {
  POS_SALE_REPOSITORY_PORT,
  type PosSaleRepositoryPort,
} from "../ports/pos-sale-repository.port";

@RequireTenant()
@Injectable()
export class ListPosTransactionsUseCase extends BaseUseCase<
  ListPosTransactionsInput,
  ListPosTransactionsOutput
> {
  constructor(
    @Inject(POS_SALE_REPOSITORY_PORT) private readonly posSaleRepo: PosSaleRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: ListPosTransactionsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListPosTransactionsOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId ?? ctx.tenantId!;
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;
    const result = await this.posSaleRepo.list(workspaceId, input);

    return ok({
      items: result.items.map((item) => item.toSummaryDto()),
      pageInfo: {
        page,
        pageSize,
        total: result.total,
        hasNextPage: page * pageSize < result.total,
      },
    });
  }
}
