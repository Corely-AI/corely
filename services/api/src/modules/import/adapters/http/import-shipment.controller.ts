import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { CsvExportInterceptor } from "../../../shared/infrastructure/csv";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import {
  WorkspaceCapabilityGuard,
  RequireWorkspaceCapability,
} from "../../../platform/guards/workspace-capability.guard";
import type {
  CreateShipmentInput,
  CreateShipmentOutput,
  UpdateShipmentInput,
  UpdateShipmentOutput,
  ListShipmentsInput,
  ListShipmentsOutput,
  GetShipmentOutput,
  SubmitShipmentInput,
  SubmitShipmentOutput,
  ReceiveShipmentInput,
  ReceiveShipmentOutput,
  AllocateLandedCostsInput,
  AllocateLandedCostsOutput,
} from "@corely/contracts";
import { CreateShipmentUseCase } from "../../application/use-cases/create-shipment.usecase";

// Helper to build use case context from request
function buildUseCaseContext(req: Request) {
  return {
    tenantId: (req as any).tenantId || (req as any).context?.tenantId,
    userId: (req as any).userId || (req as any).context?.userId,
    workspaceId: (req as any).workspaceId || (req as any).context?.workspaceId,
    correlationId: (req as any).correlationId,
    requestId: (req as any).requestId,
  };
}
import { UpdateShipmentUseCase } from "../../application/use-cases/update-shipment.usecase";
import { ListShipmentsUseCase } from "../../application/use-cases/list-shipments.usecase";
import { GetShipmentUseCase } from "../../application/use-cases/get-shipment.usecase";
import { SubmitShipmentUseCase } from "../../application/use-cases/submit-shipment.usecase";
import { ReceiveShipmentUseCase } from "../../application/use-cases/receive-shipment.usecase";
import { AllocateLandedCostsUseCase } from "../../application/use-cases/allocate-landed-costs.usecase";

@Controller("import/shipments")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("import.basic")
export class ImportShipmentController {
  constructor(
    private readonly createShipment: CreateShipmentUseCase,
    private readonly updateShipment: UpdateShipmentUseCase,
    private readonly listShipments: ListShipmentsUseCase,
    private readonly getShipment: GetShipmentUseCase,
    private readonly submitShipment: SubmitShipmentUseCase,
    private readonly receiveShipment: ReceiveShipmentUseCase,
    private readonly allocateLandedCosts: AllocateLandedCostsUseCase
  ) {}

  @Post()
  @RequirePermission("import.shipments.manage")
  async create(
    @Body() input: CreateShipmentInput,
    @Req() req: Request
  ): Promise<CreateShipmentOutput> {
    const ctx = buildUseCaseContext(req);
    const result = await this.createShipment.execute(input, ctx);
    if (!result.ok) {
      throw (result as any).error;
    }
    return result.value;
  }

  @Put(":id")
  @RequirePermission("import.shipments.manage")
  async update(
    @Param("id") shipmentId: string,
    @Body() input: Omit<UpdateShipmentInput, "shipmentId">,
    @Req() req: Request
  ): Promise<UpdateShipmentOutput> {
    const ctx = buildUseCaseContext(req);
    const result = await this.updateShipment.execute({ ...input, shipmentId }, ctx);
    if (!result.ok) {
      throw (result as any).error;
    }
    return result.value;
  }

  @Get()
  @RequirePermission("import.shipments.read")
  @UseInterceptors(CsvExportInterceptor)
  async list(
    @Query() query: ListShipmentsInput,
    @Req() req: Request
  ): Promise<ListShipmentsOutput> {
    const ctx = buildUseCaseContext(req);
    const result = await this.listShipments.execute(query, ctx);
    if (!result.ok) {
      throw (result as any).error;
    }
    return result.value;
  }

  @Get(":id")
  @RequirePermission("import.shipments.read")
  async getById(@Param("id") shipmentId: string, @Req() req: Request): Promise<GetShipmentOutput> {
    const ctx = buildUseCaseContext(req);
    const result = await this.getShipment.execute({ shipmentId }, ctx);
    if (!result.ok) {
      throw (result as any).error;
    }
    return result.value;
  }

  @Post(":id/submit")
  @RequirePermission("import.shipments.manage")
  async submit(
    @Param("id") shipmentId: string,
    @Req() req: Request
  ): Promise<SubmitShipmentOutput> {
    const ctx = buildUseCaseContext(req);
    const result = await this.submitShipment.execute({ shipmentId }, ctx);
    if (!result.ok) {
      throw (result as any).error;
    }
    return result.value;
  }

  @Post(":id/receive")
  @RequirePermission("import.shipments.manage")
  async receive(
    @Param("id") shipmentId: string,
    @Body() input: Omit<ReceiveShipmentInput, "shipmentId">,
    @Req() req: Request
  ): Promise<ReceiveShipmentOutput> {
    const ctx = buildUseCaseContext(req);
    const result = await this.receiveShipment.execute({ ...input, shipmentId }, ctx);
    if (!result.ok) {
      throw (result as any).error;
    }
    return result.value;
  }

  @Post(":id/allocate-costs")
  @RequirePermission("import.shipments.manage")
  async allocateCosts(
    @Param("id") shipmentId: string,
    @Body() input: Omit<AllocateLandedCostsInput, "shipmentId">,
    @Req() req: Request
  ): Promise<AllocateLandedCostsOutput> {
    const ctx = buildUseCaseContext(req);
    const result = await this.allocateLandedCosts.execute({ ...input, shipmentId }, ctx);
    if (!result.ok) {
      throw (result as any).error;
    }
    return result.value;
  }
}
