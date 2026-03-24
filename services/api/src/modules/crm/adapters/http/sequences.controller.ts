import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { EnrollEntityInputSchema } from "@corely/contracts";
import { EnrollEntityUseCase } from "../../application/use-cases/enroll-entity/enroll-entity.usecase";
import { CreateSequenceInputSchema, UpdateSequenceInputSchema } from "@corely/contracts";
import { CreateSequenceUseCase } from "../../application/use-cases/create-sequence/create-sequence.usecase";
import { GetSequenceByIdUseCase } from "../../application/use-cases/get-sequence-by-id/get-sequence-by-id.usecase";
import { ListSequencesUseCase } from "../../application/use-cases/list-sequences/list-sequences.usecase";
import { UpdateSequenceUseCase } from "../../application/use-cases/update-sequence/update-sequence.usecase";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "@/modules/identity/adapters/http/rbac.guard";

@Controller("crm/sequences")
@UseGuards(AuthGuard, RbacGuard)
export class SequencesHttpController {
  constructor(
    private readonly listSequences: ListSequencesUseCase,
    private readonly getSequenceById: GetSequenceByIdUseCase,
    private readonly enrollEntity: EnrollEntityUseCase,
    private readonly createSequence: CreateSequenceUseCase,
    private readonly updateSequence: UpdateSequenceUseCase
  ) {}

  @Get()
  @RequirePermission("crm.deals.read")
  async list(@Req() req: Request) {
    const result = await this.listSequences.execute({}, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post()
  @RequirePermission("crm.deals.manage")
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateSequenceInputSchema.parse(body);
    const result = await this.createSequence.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Get(":id")
  @RequirePermission("crm.deals.read")
  async getById(@Param("id") id: string, @Req() req: Request) {
    const result = await this.getSequenceById.execute({ id }, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Patch(":id")
  @RequirePermission("crm.deals.manage")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const patch = UpdateSequenceInputSchema.parse(body);
    const result = await this.updateSequence.execute({ id, ...patch }, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post("enroll")
  @RequirePermission("crm.deals.manage")
  async enroll(@Body() body: unknown, @Req() req: Request) {
    const input = EnrollEntityInputSchema.parse(body);
    const result = await this.enrollEntity.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }
}
