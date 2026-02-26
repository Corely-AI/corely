import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateIntegrationConnectionInputSchema,
  ListIntegrationConnectionsInputSchema,
  TestIntegrationConnectionInputSchema,
  UpdateIntegrationConnectionInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../../identity";
import { IntegrationsApplication } from "../../application/integrations.application";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";

@Controller("integrations/connections")
@UseGuards(AuthGuard)
export class IntegrationsConnectionsController {
  constructor(private readonly app: IntegrationsApplication) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateIntegrationConnectionInputSchema.parse(body);
    const result = await this.app.createConnection.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Get()
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const input = ListIntegrationConnectionsInputSchema.parse(query);
    const result = await this.app.listConnections.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateIntegrationConnectionInputSchema.parse({
      ...(body as Record<string, unknown>),
      id,
    });
    const result = await this.app.updateConnection.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post(":id/test")
  async test(@Param("id") id: string, @Req() req: Request) {
    const input = TestIntegrationConnectionInputSchema.parse({ id });
    const result = await this.app.testConnection.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }
}
