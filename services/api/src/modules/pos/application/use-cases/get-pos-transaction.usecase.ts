import { Inject, Injectable } from "@nestjs/common";
import type { GetPosTransactionInput, GetPosTransactionOutput } from "@corely/contracts";
import {
  BaseUseCase,
  NoopLogger,
  NotFoundError,
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
export class GetPosTransactionUseCase extends BaseUseCase<
  GetPosTransactionInput,
  GetPosTransactionOutput
> {
  constructor(
    @Inject(POS_SALE_REPOSITORY_PORT) private readonly posSaleRepo: PosSaleRepositoryPort
  ) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: GetPosTransactionInput,
    ctx: UseCaseContext
  ): Promise<Result<GetPosTransactionOutput, UseCaseError>> {
    const workspaceId = ctx.workspaceId ?? ctx.tenantId!;
    const transaction = await this.posSaleRepo.findById(workspaceId, input.transactionId);

    if (!transaction) {
      throw new NotFoundError(
        "POS transaction not found",
        { transactionId: input.transactionId },
        "Pos:TransactionNotFound"
      );
    }

    return ok({
      transaction: transaction.toDetailDto(),
    });
  }
}
