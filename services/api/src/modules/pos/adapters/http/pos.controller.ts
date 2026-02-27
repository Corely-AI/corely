import { Controller, Post, Get, Body, Query, Req, UseGuards, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import type {
  CreateRegisterInput,
  CreateRegisterOutput,
  ListRegistersInput,
  ListRegistersOutput,
  OpenShiftInput,
  OpenShiftOutput,
  CloseShiftInput,
  CloseShiftOutput,
  GetCurrentShiftInput,
  GetCurrentShiftOutput,
  SyncPosSaleInput,
  SyncPosSaleOutput,
  GetCatalogSnapshotInput,
  GetCatalogSnapshotOutput,
  StartCashlessPaymentOutput,
  GetCashlessPaymentStatusOutput,
} from "@corely/contracts";
import {
  GetCashlessPaymentStatusInputSchema,
  StartCashlessPaymentInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../../identity";
import { CreateRegisterUseCase } from "../../application/use-cases/create-register.usecase";
import { ListRegistersUseCase } from "../../application/use-cases/list-registers.usecase";
import { OpenShiftUseCase } from "../../application/use-cases/open-shift.usecase";
import { CloseShiftUseCase } from "../../application/use-cases/close-shift.usecase";
import { GetCurrentShiftUseCase } from "../../application/use-cases/get-current-shift.usecase";
import { SyncPosSaleUseCase } from "../../application/use-cases/sync-pos-sale.usecase";
import { GetCatalogSnapshotUseCase } from "../../application/use-cases/get-catalog-snapshot.usecase";
import { StartCashlessPaymentUseCase } from "../../application/use-cases/start-cashless-payment.usecase";
import { GetCashlessPaymentStatusUseCase } from "../../application/use-cases/get-cashless-payment-status.usecase";
import { toUseCaseContext } from "../../../../shared/request-context";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";

@ApiTags("POS")
@ApiBearerAuth()
@Controller("pos")
@UseGuards(AuthGuard)
export class PosController {
  constructor(
    private createRegister: CreateRegisterUseCase,
    private listRegisters: ListRegistersUseCase,
    private openShift: OpenShiftUseCase,
    private closeShift: CloseShiftUseCase,
    private getCurrentShift: GetCurrentShiftUseCase,
    private syncPosSale: SyncPosSaleUseCase,
    private getCatalogSnapshot: GetCatalogSnapshotUseCase,
    private startCashlessPayment: StartCashlessPaymentUseCase,
    private getCashlessPaymentStatus: GetCashlessPaymentStatusUseCase
  ) {}

  @Post("registers")
  @ApiOperation({ summary: "Create a new POS register" })
  async createRegisterEndpoint(
    @Body() input: CreateRegisterInput,
    @Req() req: any
  ): Promise<CreateRegisterOutput> {
    const ctx = toUseCaseContext(req);
    const result = await this.createRegister.execute(input, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Get("registers")
  @ApiOperation({ summary: "List POS registers" })
  async listRegistersEndpoint(
    @Query() input: ListRegistersInput,
    @Req() req: any
  ): Promise<ListRegistersOutput> {
    const ctx = toUseCaseContext(req);
    const result = await this.listRegisters.execute(input, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Post("shifts/open")
  @ApiOperation({ summary: "Open a shift session" })
  async openShiftEndpoint(
    @Body() input: OpenShiftInput,
    @Req() req: any
  ): Promise<OpenShiftOutput> {
    const ctx = toUseCaseContext(req);
    const result = await this.openShift.execute(input, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Post("shifts/close")
  @ApiOperation({ summary: "Close a shift session" })
  async closeShiftEndpoint(
    @Body() input: CloseShiftInput,
    @Req() req: any
  ): Promise<CloseShiftOutput> {
    const ctx = toUseCaseContext(req);
    const result = await this.closeShift.execute(input, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Get("shifts/current")
  @ApiOperation({ summary: "Get current open shift for a register" })
  async getCurrentShiftEndpoint(
    @Query() input: GetCurrentShiftInput,
    @Req() req: any
  ): Promise<GetCurrentShiftOutput> {
    const ctx = toUseCaseContext(req);
    const result = await this.getCurrentShift.execute(input, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Post("sales/sync")
  @ApiOperation({ summary: "Sync POS sale to create invoice and payment" })
  async syncPosSaleEndpoint(
    @Body() input: SyncPosSaleInput,
    @Req() req: any
  ): Promise<SyncPosSaleOutput> {
    const ctx = toUseCaseContext(req);
    const result = await this.syncPosSale.execute(input, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Get("catalog/snapshot")
  @ApiOperation({ summary: "Get product catalog snapshot for offline caching" })
  async getCatalogSnapshotEndpoint(
    @Query() input: GetCatalogSnapshotInput,
    @Req() req: any
  ): Promise<GetCatalogSnapshotOutput> {
    const ctx = toUseCaseContext(req);
    const result = await this.getCatalogSnapshot.execute(input, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Post("payments/cashless/start")
  @ApiOperation({ summary: "Start a cashless payment attempt" })
  async startCashlessPaymentEndpoint(
    @Body() body: unknown,
    @Req() req: any
  ): Promise<StartCashlessPaymentOutput> {
    const parsed = StartCashlessPaymentInputSchema.parse({
      ...(body as Record<string, unknown>),
      idempotencyKey:
        (body as Record<string, unknown>)?.idempotencyKey ?? resolveIdempotencyKey(req),
    });

    const ctx = toUseCaseContext(req);
    const result = await this.startCashlessPayment.execute(parsed, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      workspaceId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
      correlationId: ctx.correlationId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }

  @Get("payments/cashless/:attemptId")
  @ApiOperation({ summary: "Get cashless payment attempt status" })
  async getCashlessPaymentStatusEndpoint(
    @Param("attemptId") attemptId: string,
    @Req() req: any
  ): Promise<GetCashlessPaymentStatusOutput> {
    const parsed = GetCashlessPaymentStatusInputSchema.parse({ attemptId });
    const ctx = toUseCaseContext(req);
    const result = await this.getCashlessPaymentStatus.execute(parsed, {
      tenantId: ctx.workspaceId ?? ctx.tenantId,
      workspaceId: ctx.workspaceId ?? ctx.tenantId,
      userId: ctx.userId,
      requestId: ctx.requestId,
      correlationId: ctx.correlationId,
    });

    if ("error" in result) {
      throw result.error;
    }

    return result.value;
  }
}
