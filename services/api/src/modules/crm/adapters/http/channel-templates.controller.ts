import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateChannelTemplateInputSchema,
  DeleteChannelTemplateInputSchema,
  GenerateChannelTemplateAiInputSchema,
  ListChannelTemplatesQuerySchema,
  UpdateChannelTemplateInputSchema,
} from "@corely/contracts";
import { CrmApplication } from "../../application/crm.application";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm/workspaces/:workspaceId/channel-templates")
@UseGuards(AuthGuard, RbacGuard)
export class ChannelTemplatesHttpController {
  constructor(private readonly app: CrmApplication) {}

  @Get()
  @RequirePermission("crm.deals.read")
  async list(@Param("workspaceId") workspaceId: string, @Query() query: any, @Req() req: Request) {
    const input = ListChannelTemplatesQuerySchema.parse({
      workspaceId,
      channel: query.channel,
      q: query.q,
    });

    const result = await this.app.listChannelTemplates.execute(
      input,
      buildUseCaseContext(req as any)
    );
    return mapResultToHttp(result);
  }

  @Post()
  @RequirePermission("crm.deals.manage")
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreateChannelTemplateInputSchema.parse({
      ...(body as Record<string, unknown>),
      workspaceId,
    });

    const result = await this.app.createChannelTemplate.execute(
      input,
      buildUseCaseContext(req as any)
    );
    return mapResultToHttp(result);
  }

  @Post("ai/generate")
  @RequirePermission("crm.deals.manage")
  async generateAi(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = GenerateChannelTemplateAiInputSchema.parse({
      ...(body as Record<string, unknown>),
      workspaceId,
    });

    const result = await this.app.generateChannelTemplateAi.execute(
      input,
      buildUseCaseContext(req as any)
    );
    return mapResultToHttp(result);
  }

  @Patch(":id")
  @RequirePermission("crm.deals.manage")
  async update(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateChannelTemplateInputSchema.parse({
      ...(body as Record<string, unknown>),
      workspaceId,
      templateId: id,
    });

    const result = await this.app.updateChannelTemplate.execute(
      input,
      buildUseCaseContext(req as any)
    );
    return mapResultToHttp(result);
  }

  @Delete(":id")
  @RequirePermission("crm.deals.manage")
  async remove(
    @Param("workspaceId") workspaceId: string,
    @Param("id") id: string,
    @Req() req: Request
  ) {
    const input = DeleteChannelTemplateInputSchema.parse({
      workspaceId,
      templateId: id,
    });

    const result = await this.app.deleteChannelTemplate.execute(
      input,
      buildUseCaseContext(req as any)
    );
    return mapResultToHttp(result);
  }
}
