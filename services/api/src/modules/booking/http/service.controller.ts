import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AuthGuard } from "../../identity/adapters/http/auth.guard";
import { RequireTenant } from "@corely/kernel";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { parseListQuery, buildPageInfo } from "../../../shared/http/pagination";

import { CreateServiceOfferingUseCase } from "../application/use-cases/create-service.usecase";
import { UpdateServiceOfferingUseCase } from "../application/use-cases/update-service.usecase";
import { ListServiceOfferingsUseCase } from "../application/use-cases/list-services.usecase";
import { GetServiceOfferingUseCase } from "../application/use-cases/get-service.usecase";
import { DeleteServiceOfferingUseCase } from "../application/use-cases/delete-service.usecase";

import {
  CreateServiceOfferingInputSchema,
  UpdateServiceOfferingInputSchema,
  ListServiceOfferingsInputSchema,
} from "@corely/contracts";

@Controller("booking/services")
@UseGuards(AuthGuard)
@RequireTenant()
export class BookingServiceController {
  constructor(
    private readonly createService: CreateServiceOfferingUseCase,
    private readonly updateService: UpdateServiceOfferingUseCase,
    private readonly listServices: ListServiceOfferingsUseCase,
    private readonly getService: GetServiceOfferingUseCase,
    private readonly deleteService: DeleteServiceOfferingUseCase
  ) {}

  @Post()
  async create(@Req() req: Request, @Body() body: any) {
    const parsedBody = CreateServiceOfferingInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const idempotencyKey = resolveIdempotencyKey(req);
    const service = await this.createService.execute({ ...parsedBody, idempotencyKey } as any, ctx);
    return { service };
  }

  @Get()
  async list(@Req() req: Request, @Query() query: any) {
    const parsedQuery = ListServiceOfferingsInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const { page, pageSize } = parseListQuery(query);
    const result = await this.listServices.execute({ ...parsedQuery, page, pageSize }, ctx);
    return { items: result.items, pageInfo: buildPageInfo(result.total, page, pageSize) };
  }

  @Get(":id")
  async get(@Req() req: Request, @Param("id") id: string) {
    const ctx = buildUseCaseContext(req);
    const service = await this.getService.execute(id, ctx);
    return { service };
  }

  @Patch(":id")
  async update(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    const parsedBody = UpdateServiceOfferingInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const service = await this.updateService.execute({ serviceId: id, ...parsedBody } as any, ctx);
    return { service };
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    const ctx = buildUseCaseContext(req);
    await this.deleteService.execute(id, ctx);
    return { success: true };
  }
}
