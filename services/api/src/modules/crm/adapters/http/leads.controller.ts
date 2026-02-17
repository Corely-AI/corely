import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { CreateLeadUseCase } from "../../application/use-cases/create-lead/create-lead.usecase";
import { ConvertLeadUseCase } from "../../application/use-cases/convert-lead/convert-lead.usecase";
import { ListLeadsUseCase } from "../../application/use-cases/list-leads/list-leads.usecase";
import { GetLeadUseCase } from "../../application/use-cases/get-lead/get-lead.usecase";
import { CreateLeadInputSchema, ConvertLeadInputSchema } from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm/leads")
@UseGuards(AuthGuard, RbacGuard)
export class LeadsController {
  constructor(
    private readonly createLead: CreateLeadUseCase,
    private readonly convertLead: ConvertLeadUseCase,
    private readonly listLeads: ListLeadsUseCase,
    private readonly getLead: GetLeadUseCase
  ) {}

  @Post()
  @RequirePermission("crm.deals.manage")
  async create(@Req() req: Request, @Body() body: unknown) {
    const input = CreateLeadInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.createLead.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":id/convert")
  @RequirePermission("crm.deals.manage")
  async convert(@Req() req: Request, @Param("id") id: string, @Body() body: unknown) {
    // Merge id into input
    const rawInput = { ...(body as any), leadId: id };
    const input = ConvertLeadInputSchema.parse(rawInput);
    const ctx = buildUseCaseContext(req);
    const result = await this.convertLead.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get()
  @RequirePermission("crm.deals.read")
  async list(@Req() req: Request, @Query("status") status?: string) {
    const result = await this.listLeads.execute({ status }, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Get(":id")
  @RequirePermission("crm.deals.read")
  async get(@Req() req: Request, @Param("id") id: string) {
    const result = await this.getLead.execute({ id }, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }
}
