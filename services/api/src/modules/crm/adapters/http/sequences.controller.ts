import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { EnrollEntityInputSchema } from "@corely/contracts";
import { EnrollEntityUseCase } from "../../application/use-cases/enroll-entity/enroll-entity.usecase";
import { CreateSequenceInputSchema } from "@corely/contracts";
import { CreateSequenceUseCase } from "../../application/use-cases/create-sequence/create-sequence.usecase";
import { ListSequencesUseCase } from "../../application/use-cases/list-sequences/list-sequences.usecase";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm/sequences")
@UseGuards(AuthGuard, RbacGuard)
export class SequencesHttpController {
  constructor(
    private readonly listSequences: ListSequencesUseCase,
    private readonly enrollEntity: EnrollEntityUseCase,
    private readonly createSequence: CreateSequenceUseCase
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

  @Post("enroll")
  @RequirePermission("crm.deals.manage")
  async enroll(@Body() body: unknown, @Req() req: Request) {
    const input = EnrollEntityInputSchema.parse(body);
    const result = await this.enrollEntity.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }
}
