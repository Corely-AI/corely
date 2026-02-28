import { Inject, Injectable } from "@nestjs/common";
import type { CreateCashRegister } from "@corely/contracts";
import {
  AUDIT_PORT,
  BaseUseCase,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  type AuditPort,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import { CASH_REGISTER_REPO, type CashRegisterRepoPort } from "../ports/cash-management.ports";
import { toRegisterDto } from "../cash-management.mapper";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { storeIdempotentBody, getIdempotentBody } from "./idempotency";
import { assertCanManageCash } from "../../policies/assert-cash-policies";

const ACTION_KEY = "cash-management.register.create";

@RequireTenant()
@Injectable()
export class CreateCashRegisterUseCase extends BaseUseCase<
  CreateCashRegister,
  { register: ReturnType<typeof toRegisterDto> }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT)
    private readonly outbox: OutboxPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotencyStore: IdempotencyStoragePort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: CreateCashRegister,
    ctx: UseCaseContext
  ): Promise<Result<{ register: ReturnType<typeof toRegisterDto> }, UseCaseError>> {
    assertCanManageCash(ctx);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const cached = await getIdempotentBody<{ register: ReturnType<typeof toRegisterDto> }>({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const register = await this.unitOfWork.withinTransaction(async (tx) => {
      const created = await this.registerRepo.createRegister(
        {
          tenantId,
          workspaceId,
          name: input.name,
          location: input.location ?? null,
          currency: input.currency,
          disallowNegativeBalance: input.disallowNegativeBalance ?? false,
        },
        tx
      );

      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "cash.register.created",
          entityType: "CashRegister",
          entityId: created.id,
          metadata: {
            name: created.name,
            currency: created.currency,
          },
        },
        tx
      );

      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "cash.register.created",
          payload: {
            registerId: created.id,
            name: created.name,
            currency: created.currency,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      return created;
    });

    const response = { register: toRegisterDto(register) };

    await storeIdempotentBody({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
      body: response,
    });

    return ok(response);
  }
}
