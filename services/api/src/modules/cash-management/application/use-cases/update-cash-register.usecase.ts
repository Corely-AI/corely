import { Inject, Injectable } from "@nestjs/common";
import type { UpdateCashRegister } from "@corely/contracts";
import {
  AUDIT_PORT,
  BaseUseCase,
  NotFoundError,
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
import { assertCanManageCash } from "../../policies/assert-cash-policies";

@RequireTenant()
@Injectable()
export class UpdateCashRegisterUseCase extends BaseUseCase<
  { registerId: string; input: UpdateCashRegister },
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
    private readonly unitOfWork: UnitOfWorkPort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: { registerId: string; input: UpdateCashRegister },
    ctx: UseCaseContext
  ): Promise<Result<{ register: ReturnType<typeof toRegisterDto> }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const existing = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      input.registerId
    );
    if (!existing) {
      throw new NotFoundError(
        "Cash register not found",
        undefined,
        "CashManagement:RegisterNotFound"
      );
    }

    const updated = await this.unitOfWork.withinTransaction(async (tx) => {
      const register = await this.registerRepo.updateRegister(
        tenantId,
        workspaceId,
        input.registerId,
        {
          name: input.input.name,
          location: input.input.location,
          disallowNegativeBalance: input.input.disallowNegativeBalance,
        },
        tx
      );

      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "cash.register.updated",
          entityType: "CashRegister",
          entityId: register.id,
          metadata: {
            previous: {
              name: existing.name,
              location: existing.location,
              disallowNegativeBalance: existing.disallowNegativeBalance,
            },
            next: {
              name: register.name,
              location: register.location,
              disallowNegativeBalance: register.disallowNegativeBalance,
            },
          },
        },
        tx
      );

      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "cash.register.updated",
          payload: {
            registerId: register.id,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      return register;
    });

    return ok({ register: toRegisterDto(updated) });
  }
}
