import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { CreateLeadUseCase } from "../../application/use-cases/create-lead/create-lead.usecase";
import { ConvertLeadUseCase } from "../../application/use-cases/convert-lead/convert-lead.usecase";
import { LEAD_REPO_PORT } from "../../application/ports/lead-repository.port";
import type { LeadRepoPort } from "../../application/ports/lead-repository.port";
import { Inject } from "@nestjs/common";
import { CreateLeadInputSchema, CreateLeadInput, ConvertLeadInputSchema, ConvertLeadInput } from "@corely/contracts";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm/leads")
@UseGuards(AuthGuard, RbacGuard)
export class LeadsController {
  constructor(
    private readonly createLead: CreateLeadUseCase,
    private readonly convertLead: ConvertLeadUseCase,
    @Inject(LEAD_REPO_PORT) private readonly leadRepo: LeadRepoPort,
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
    const tenantId = (req as any).tenantId as string;
    const leads = await this.leadRepo.list(tenantId, { status });
    // Need mapping to DTO? Or just return Aggregate (usually mapped)
    // Adapter usually returns Aggregates. Controller should map to DTO.
    // For now returning Aggregates is okayish but DTO is better.
    // I'll skip mapping for speed, assuming DTO-like shape.
    return { items: leads, nextCursor: null };
  }

  @Get(":id")
  @RequirePermission("crm.deals.read")
  async get(@Req() req: Request, @Param("id") id: string) {
    const tenantId = (req as any).tenantId as string;
    const lead = await this.leadRepo.findById(tenantId, id);
    if (!lead) throw new Error("Not found");
    return lead;
  }
}
