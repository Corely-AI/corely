import { Inject, Injectable } from "@nestjs/common";
import {
  NotFoundError,
  ValidationError,
  err,
  isErr,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import {
  REGISTER_REPOSITORY_PORT,
  type RegisterRepositoryPort,
} from "../ports/register-repository.port";
import { CreateRegisterUseCase as CreateCashRegisterUseCase } from "../../../cash-management/application/use-cases/create-register.usecase";
import { GetCashRegisterQueryUseCase } from "../../../cash-management/application/use-cases/get-cash-register.query";
import type { Register } from "../../domain/register.aggregate";

export type PosCashScope = {
  posWorkspaceId: string;
  cashTenantId: string;
  cashManagementContext: UseCaseContext;
};

export const buildPosCashScope = (ctx: UseCaseContext): Result<PosCashScope, ValidationError> => {
  const posWorkspaceId = ctx.workspaceId ?? ctx.tenantId;
  if (!posWorkspaceId) {
    return err(
      new ValidationError(
        "Missing POS workspace context",
        undefined,
        "Pos:WorkspaceContextRequired"
      )
    );
  }

  const cashTenantId =
    typeof ctx.metadata?.platformTenantId === "string"
      ? ctx.metadata.platformTenantId
      : (ctx.workspaceId ?? ctx.tenantId);
  if (!cashTenantId) {
    return err(
      new ValidationError("Missing cash tenant context", undefined, "Pos:CashTenantContextRequired")
    );
  }

  return ok({
    posWorkspaceId,
    cashTenantId,
    cashManagementContext: {
      ...ctx,
      tenantId: cashTenantId,
      workspaceId: posWorkspaceId,
    },
  });
};

type ResolveCashDrawerInput = {
  posRegisterId: string;
  autoCreate?: boolean;
  cashDrawerName?: string;
  location?: string | null;
  currency?: string;
  idempotencyKey?: string;
};

type ResolveCashDrawerOutput = {
  posRegister: Register;
  cashDrawerId: string;
  resolution: "bound" | "auto_created";
  scope: PosCashScope;
};

@Injectable()
export class ResolveCashDrawerForPosRegisterService {
  constructor(
    @Inject(REGISTER_REPOSITORY_PORT)
    private readonly registerRepo: RegisterRepositoryPort,
    private readonly createCashRegister: CreateCashRegisterUseCase,
    private readonly getCashRegister: GetCashRegisterQueryUseCase
  ) {}

  /**
   * POS registers scope the selling station and shift lifecycle.
   * Cash drawers remain a separate cash-management concept for custody and reconciliation.
   * The bridge between them is explicit via `cashDrawerId`; POS register IDs must never be
   * reused as cash-management register IDs.
   */
  async execute(
    input: ResolveCashDrawerInput,
    ctx: UseCaseContext
  ): Promise<Result<ResolveCashDrawerOutput, UseCaseError>> {
    const scopeResult = buildPosCashScope(ctx);
    if (isErr(scopeResult)) {
      return err(scopeResult.error);
    }

    const scope = scopeResult.value;
    const posRegister = await this.registerRepo.findById(scope.posWorkspaceId, input.posRegisterId);
    if (!posRegister) {
      return err(
        new NotFoundError(
          "POS register not found",
          { posRegisterId: input.posRegisterId },
          "Pos:RegisterNotFound"
        )
      );
    }

    if (posRegister.cashDrawerId) {
      const existing = await this.getCashRegister.execute(
        { registerId: posRegister.cashDrawerId },
        scope.cashManagementContext
      );
      if (!isErr(existing)) {
        return ok({
          posRegister,
          cashDrawerId: posRegister.cashDrawerId,
          resolution: "bound",
          scope,
        });
      }
      if (existing.error.code !== "CashManagement:RegisterNotFound") {
        return err(existing.error);
      }
      if (!input.autoCreate) {
        return err(
          new ValidationError(
            "POS register is bound to a missing cash drawer",
            {
              posRegisterId: input.posRegisterId,
              cashDrawerId: posRegister.cashDrawerId,
            },
            "Pos:RegisterCashDrawerBindingInvalid"
          )
        );
      }
    } else if (!input.autoCreate) {
      return err(
        new ValidationError(
          "POS register is not bound to a cash drawer",
          { posRegisterId: input.posRegisterId },
          "Pos:RegisterCashDrawerNotBound"
        )
      );
    }

    const createResult = await this.createCashRegister.execute(
      {
        name: input.cashDrawerName ?? `${posRegister.name} Cash Drawer`,
        location: input.location ?? null,
        currency: input.currency ?? "EUR",
        idempotencyKey:
          input.idempotencyKey ??
          `pos-register-cash-drawer:${scope.posWorkspaceId}:${input.posRegisterId}`,
      },
      scope.cashManagementContext
    );
    if (isErr(createResult)) {
      return err(createResult.error);
    }

    const cashDrawerId = createResult.value.register.id;
    posRegister.bindCashDrawer(cashDrawerId);
    await this.registerRepo.update(posRegister);

    return ok({
      posRegister,
      cashDrawerId,
      resolution: "auto_created",
      scope,
    });
  }
}
