import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { 
    EnrollEntityInputSchema
} from "@corely/contracts";
import { EnrollEntityUseCase } from "../../application/use-cases/enroll-entity/enroll-entity.usecase";
import { PrismaSequenceRepoAdapter } from "../../infrastructure/prisma/prisma-sequence-repo.adapter";
import type { UseCaseContext } from "@corely/kernel";
import { Err } from "@corely/kernel";

import { CreateSequenceInputSchema } from "@corely/contracts";
import { CreateSequenceUseCase } from "../../application/use-cases/create-sequence/create-sequence.usecase";

@Controller("crm/sequences")
export class SequencesHttpController {
  constructor(
    private readonly enrollEntity: EnrollEntityUseCase,
    private readonly createSequence: CreateSequenceUseCase,
    private readonly sequenceRepo: PrismaSequenceRepoAdapter
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const tenantId = (req as { tenantId?: string }).tenantId;
    return this.sequenceRepo.list(tenantId!);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateSequenceInputSchema.parse(body);
    const user = (req as { user?: { id?: string } }).user;
    const ctx: UseCaseContext = { tenantId: (req as { tenantId?: string }).tenantId!, userId: user?.id };
    const result = await this.createSequence.execute(input, ctx);
    if (!result.ok) {
      throw (result as Err<unknown>).error;
    }
    return result.value;
  }

  @Post("enroll")
  async enroll(@Body() body: unknown, @Req() req: Request) {
    const input = EnrollEntityInputSchema.parse(body);
    const ctx: UseCaseContext = { tenantId: (req as { tenantId?: string }).tenantId! };
    const result = await this.enrollEntity.execute(input, ctx);
    if (!result.ok) {
      throw (result as Err<unknown>).error;
    }
    return { enrollmentId: result.value.enrollmentId };
  }
}
