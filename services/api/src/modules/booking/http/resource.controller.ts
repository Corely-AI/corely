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

import { CreateResourceUseCase } from "../application/use-cases/create-resource.usecase";
import { UpdateResourceUseCase } from "../application/use-cases/update-resource.usecase";
import { ListResourcesUseCase } from "../application/use-cases/list-resources.usecase";
import { GetResourceUseCase } from "../application/use-cases/get-resource.usecase";
import { DeleteResourceUseCase } from "../application/use-cases/delete-resource.usecase";

import {
  CreateResourceInputSchema,
  UpdateResourceInputSchema,
  ListResourcesInputSchema,
} from "@corely/contracts";

@Controller("booking/resources")
@UseGuards(AuthGuard)
@RequireTenant()
export class BookingResourceController {
  constructor(
    private readonly createResource: CreateResourceUseCase,
    private readonly updateResource: UpdateResourceUseCase,
    private readonly listResources: ListResourcesUseCase,
    private readonly getResource: GetResourceUseCase,
    private readonly deleteResource: DeleteResourceUseCase
  ) {}

  @Post()
  async create(@Req() req: Request, @Body() body: any) {
    const parsedBody = CreateResourceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const idempotencyKey = resolveIdempotencyKey(req);
    const resource = await this.createResource.execute(
      { ...parsedBody, idempotencyKey } as any,
      ctx
    );
    return { resource };
  }

  @Get()
  async list(@Req() req: Request, @Query() query: any) {
    const parsedQuery = ListResourcesInputSchema.parse(query);
    const ctx = buildUseCaseContext(req);
    const { page, pageSize } = parseListQuery(query);
    const result = await this.listResources.execute({ ...parsedQuery, page, pageSize }, ctx);
    return { items: result.items, pageInfo: buildPageInfo(result.total, page, pageSize) };
  }

  @Get(":id")
  async get(@Req() req: Request, @Param("id") id: string) {
    const ctx = buildUseCaseContext(req);
    const resource = await this.getResource.execute(id, ctx);
    return { resource };
  }

  @Patch(":id")
  async update(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    const parsedBody = UpdateResourceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const resource = await this.updateResource.execute({ resourceId: id, ...parsedBody }, ctx);
    return { resource };
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    const ctx = buildUseCaseContext(req);
    await this.deleteResource.execute(id, ctx);
    return { success: true };
  }
}
