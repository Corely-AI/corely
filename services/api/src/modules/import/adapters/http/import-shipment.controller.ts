import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { AuthGuard } from "../../../auth/guards/auth.guard";
import { CsvExportInterceptor } from "../../../shared/infrastructure/csv";
import { RbacGuard } from "../../../auth/guards/rbac.guard";
import { Permission } from "../../../auth/decorators/permission.decorator";
import { WorkspaceCapabilityGuard } from "../../../workspaces/guards/workspace-capability.guard";
import { RequireCapability } from "../../../workspaces/decorators/require-capability.decorator";
import { Context } from "../../../shared/decorators/context.decorator";
import type { UseCaseContext } from "@corely/kernel";
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
import { UpdateShipmentUseCase } from "../../application/use-cases/update-shipment.usecase";
import { ListShipmentsUseCase } from "../../application/use-cases/list-shipments.usecase";
import { GetShipmentUseCase } from "../../application/use-cases/get-shipment.usecase";
import { SubmitShipmentUseCase } from "../../application/use-cases/submit-shipment.usecase";
import { ReceiveShipmentUseCase } from "../../application/use-cases/receive-shipment.usecase";
import { AllocateLandedCostsUseCase } from "../../application/use-cases/allocate-landed-costs.usecase";

@Controller("import/shipments")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireCapability("import.basic")
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
  @Permission("import.shipments.manage")
  async create(
    @Body() input: CreateShipmentInput,
    @Context() ctx: UseCaseContext
  ): Promise<CreateShipmentOutput> {
    const result = await this.createShipment.execute(input, ctx);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  @Put(":id")
  @Permission("import.shipments.manage")
  async update(
    @Param("id") shipmentId: string,
    @Body() input: Omit<UpdateShipmentInput, "shipmentId">,
    @Context() ctx: UseCaseContext
  ): Promise<UpdateShipmentOutput> {
    const result = await this.updateShipment.execute({ ...input, shipmentId }, ctx);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  @Get()
  @Permission("import.shipments.read")
  @UseInterceptors(CsvExportInterceptor)
  async list(
    @Query() query: ListShipmentsInput,
    @Context() ctx: UseCaseContext
  ): Promise<ListShipmentsOutput> {
    const result = await this.listShipments.execute(query, ctx);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  @Get(":id")
  @Permission("import.shipments.read")
  async getById(
    @Param("id") shipmentId: string,
    @Context() ctx: UseCaseContext
  ): Promise<GetShipmentOutput> {
    const result = await this.getShipment.execute({ shipmentId }, ctx);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  @Post(":id/submit")
  @Permission("import.shipments.manage")
  async submit(
    @Param("id") shipmentId: string,
    @Context() ctx: UseCaseContext
  ): Promise<SubmitShipmentOutput> {
    const result = await this.submitShipment.execute({ shipmentId }, ctx);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  @Post(":id/receive")
  @Permission("import.shipments.manage")
  async receive(
    @Param("id") shipmentId: string,
    @Body() input: Omit<ReceiveShipmentInput, "shipmentId">,
    @Context() ctx: UseCaseContext
  ): Promise<ReceiveShipmentOutput> {
    const result = await this.receiveShipment.execute({ ...input, shipmentId }, ctx);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }

  @Post(":id/allocate-costs")
  @Permission("import.shipments.manage")
  async allocateCosts(
    @Param("id") shipmentId: string,
    @Body() input: Omit<AllocateLandedCostsInput, "shipmentId">,
    @Context() ctx: UseCaseContext
  ): Promise<AllocateLandedCostsOutput> {
    const result = await this.allocateLandedCosts.execute({ ...input, shipmentId }, ctx);
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }
}
