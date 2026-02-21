import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  ApproveApplicationInputSchema,
  ClassGroupInstructorsOutputSchema,
  CreateApplicationInputSchema,
  CreateClassGroupResourceInputSchema,
  CreateCohortFromProgramInputSchema,
  CreateMilestoneInputSchema,
  CreateProgramInputSchema,
  GenerateBillingPlanInvoicesInputSchema,
  GenerateBillingPlanInvoicesOutputSchema,
  GetEnrollmentBillingPlanOutputSchema,
  GetOutcomesSummaryOutputSchema,
  ListClassGroupResourcesOutputSchema,
  ListMilestonesOutputSchema,
  ListProgramsInputSchema,
  ProgramDetailSchema,
  ReorderClassGroupResourcesInputSchema,
  UpdateClassGroupResourceInputSchema,
  UpdateCohortLifecycleInputSchema,
  UpdateMilestoneInputSchema,
  UpdateProgramInputSchema,
  UpsertClassGroupInstructorsInputSchema,
  UpsertEnrollmentBillingPlanInputSchema,
  UpsertMilestoneCompletionInputSchema,
} from "@corely/contracts/classes";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { CreateProgramUseCase } from "../application/use-cases/create-program.usecase";
import { UpdateProgramUseCase } from "../application/use-cases/update-program.usecase";
import { ListProgramsUseCase } from "../application/use-cases/list-programs.usecase";
import { GetProgramUseCase } from "../application/use-cases/get-program.usecase";
import { CreateCohortFromProgramUseCase } from "../application/use-cases/create-cohort-from-program.usecase";
import { UpdateCohortLifecycleUseCase } from "../application/use-cases/update-cohort-lifecycle.usecase";
import { ListCohortTeamUseCase } from "../application/use-cases/list-cohort-team.usecase";
import { UpsertCohortTeamUseCase } from "../application/use-cases/upsert-cohort-team.usecase";
import { CreateApplicationUseCase } from "../application/use-cases/create-application.usecase";
import { ApproveApplicationUseCase } from "../application/use-cases/approve-application.usecase";
import { GetEnrollmentBillingPlanUseCase } from "../application/use-cases/get-enrollment-billing-plan.usecase";
import { UpsertEnrollmentBillingPlanUseCase } from "../application/use-cases/upsert-enrollment-billing-plan.usecase";
import { GenerateInvoicesFromEnrollmentBillingPlanUseCase } from "../application/use-cases/generate-invoices-from-enrollment-billing-plan.usecase";
import { ListMilestonesUseCase } from "../application/use-cases/list-milestones.usecase";
import { CreateMilestoneUseCase } from "../application/use-cases/create-milestone.usecase";
import { UpdateMilestoneUseCase } from "../application/use-cases/update-milestone.usecase";
import { DeleteMilestoneUseCase } from "../application/use-cases/delete-milestone.usecase";
import { UpsertMilestoneCompletionUseCase } from "../application/use-cases/upsert-milestone-completion.usecase";
import { GetOutcomesSummaryUseCase } from "../application/use-cases/get-outcomes-summary.usecase";
import { ListResourcesUseCase } from "../application/use-cases/list-resources.usecase";
import { CreateResourceUseCase } from "../application/use-cases/create-resource.usecase";
import { UpdateResourceUseCase } from "../application/use-cases/update-resource.usecase";
import { DeleteResourceUseCase } from "../application/use-cases/delete-resource.usecase";
import { ReorderResourcesUseCase } from "../application/use-cases/reorder-resources.usecase";
import {
  toClassGroupInstructorDto,
  toEnrollmentBillingPlanDto,
  toBillingInvoiceLinkDto,
  toMilestoneCompletionDto,
  toMilestoneDto,
  toProgramDto,
  toProgramMilestoneTemplateDto,
  toProgramSessionTemplateDto,
  toResourceDto,
  toEnrollmentDto,
  toClassGroupDto,
} from "./mappers/classes.mappers";

@Controller("classes")
@UseGuards(AuthGuard, RbacGuard)
export class ClassesAcademyController {
  constructor(
    private readonly createProgramUseCase: CreateProgramUseCase,
    private readonly updateProgramUseCase: UpdateProgramUseCase,
    private readonly listProgramsUseCase: ListProgramsUseCase,
    private readonly getProgramUseCase: GetProgramUseCase,
    private readonly createCohortFromProgramUseCase: CreateCohortFromProgramUseCase,
    private readonly updateCohortLifecycleUseCase: UpdateCohortLifecycleUseCase,
    private readonly listCohortTeamUseCase: ListCohortTeamUseCase,
    private readonly upsertCohortTeamUseCase: UpsertCohortTeamUseCase,
    private readonly createApplicationUseCase: CreateApplicationUseCase,
    private readonly approveApplicationUseCase: ApproveApplicationUseCase,
    private readonly getEnrollmentBillingPlanUseCase: GetEnrollmentBillingPlanUseCase,
    private readonly upsertEnrollmentBillingPlanUseCase: UpsertEnrollmentBillingPlanUseCase,
    private readonly generateInvoicesFromEnrollmentBillingPlanUseCase: GenerateInvoicesFromEnrollmentBillingPlanUseCase,
    private readonly listMilestonesUseCase: ListMilestonesUseCase,
    private readonly createMilestoneUseCase: CreateMilestoneUseCase,
    private readonly updateMilestoneUseCase: UpdateMilestoneUseCase,
    private readonly deleteMilestoneUseCase: DeleteMilestoneUseCase,
    private readonly upsertMilestoneCompletionUseCase: UpsertMilestoneCompletionUseCase,
    private readonly getOutcomesSummaryUseCase: GetOutcomesSummaryUseCase,
    private readonly listResourcesUseCase: ListResourcesUseCase,
    private readonly createResourceUseCase: CreateResourceUseCase,
    private readonly updateResourceUseCase: UpdateResourceUseCase,
    private readonly deleteResourceUseCase: DeleteResourceUseCase,
    private readonly reorderResourcesUseCase: ReorderResourcesUseCase
  ) {}

  @Get("programs")
  @RequirePermission("classes.cohort.manage")
  async listPrograms(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListProgramsInputSchema.parse({
      ...listQuery,
      levelTag: typeof query.levelTag === "string" ? query.levelTag : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.listProgramsUseCase.execute(
      { ...input, page: listQuery.page, pageSize: listQuery.pageSize },
      ctx
    );

    return {
      items: result.items.map(toProgramDto),
      pageInfo: result.pageInfo,
    };
  }

  @Post("programs")
  @RequirePermission("classes.cohort.manage")
  async createProgram(@Body() body: unknown, @Req() req: Request) {
    const input = CreateProgramInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.createProgramUseCase.execute(
      { ...input, idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey },
      ctx
    );

    return ProgramDetailSchema.parse({
      program: toProgramDto(result.program),
      sessionTemplates: result.sessionTemplates.map(toProgramSessionTemplateDto),
      milestoneTemplates: result.milestoneTemplates.map(toProgramMilestoneTemplateDto),
    });
  }

  @Get("programs/:id")
  @RequirePermission("classes.cohort.manage")
  async getProgram(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getProgramUseCase.execute({ programId: id }, ctx);

    return ProgramDetailSchema.parse({
      program: toProgramDto(result.program),
      sessionTemplates: result.sessionTemplates.map(toProgramSessionTemplateDto),
      milestoneTemplates: result.milestoneTemplates.map(toProgramMilestoneTemplateDto),
    });
  }

  @Patch("programs/:id")
  @RequirePermission("classes.cohort.manage")
  async updateProgram(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateProgramInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.updateProgramUseCase.execute({ ...input, programId: id }, ctx);

    return ProgramDetailSchema.parse({
      program: toProgramDto(result.program),
      sessionTemplates: result.sessionTemplates.map(toProgramSessionTemplateDto),
      milestoneTemplates: result.milestoneTemplates.map(toProgramMilestoneTemplateDto),
    });
  }

  @Post("programs/:id/create-cohort")
  @RequirePermission("classes.cohort.manage")
  async createCohortFromProgram(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreateCohortFromProgramInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.createCohortFromProgramUseCase.execute(
      {
        ...input,
        programId: id,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return {
      classGroup: {
        id: result.classGroupId,
      },
      createdSessionCount: result.createdSessionCount,
      createdMilestoneCount: result.createdMilestoneCount,
    };
  }

  @Post("class-groups/:id/lifecycle")
  @RequirePermission("classes.cohort.manage")
  async updateCohortLifecycle(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateCohortLifecycleInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const updated = await this.updateCohortLifecycleUseCase.execute(
      { classGroupId: id, lifecycle: input.lifecycle },
      ctx
    );

    return {
      classGroup: toClassGroupDto(updated),
    };
  }

  @Get("class-groups/:id/team")
  @RequirePermission("classes.read")
  async listCohortTeam(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const items = await this.listCohortTeamUseCase.execute({ classGroupId: id }, ctx);
    return ClassGroupInstructorsOutputSchema.parse({ items: items.map(toClassGroupInstructorDto) });
  }

  @Put("class-groups/:id/team")
  @RequirePermission("classes.cohort.team.manage")
  async upsertCohortTeam(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpsertClassGroupInstructorsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const items = await this.upsertCohortTeamUseCase.execute(
      {
        classGroupId: id,
        members: input.members.map((member) => ({
          partyId: member.partyId,
          role: member.role,
        })),
      },
      ctx
    );
    return ClassGroupInstructorsOutputSchema.parse({ items: items.map(toClassGroupInstructorDto) });
  }

  @Post("class-groups/:id/applications")
  @RequirePermission("classes.enrollment.manage")
  async createApplication(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = CreateApplicationInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const enrollment = await this.createApplicationUseCase.execute(
      {
        ...input,
        classGroupId: id,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return {
      enrollment: toEnrollmentDto(enrollment),
    };
  }

  @Post("enrollments/:id/approve")
  @RequirePermission("classes.enrollment.manage")
  async approveApplication(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = ApproveApplicationInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const enrollment = await this.approveApplicationUseCase.execute(
      {
        ...input,
        enrollmentId: id,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return {
      enrollment: toEnrollmentDto(enrollment),
    };
  }

  @Get("enrollments/:id/billing-plan")
  @RequirePermission("classes.cohort.billing.manage")
  async getEnrollmentBillingPlan(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const billingPlan = await this.getEnrollmentBillingPlanUseCase.execute(
      { enrollmentId: id },
      ctx
    );
    return GetEnrollmentBillingPlanOutputSchema.parse({
      billingPlan: billingPlan ? toEnrollmentBillingPlanDto(billingPlan) : null,
    });
  }

  @Put("enrollments/:id/billing-plan")
  @RequirePermission("classes.cohort.billing.manage")
  async upsertEnrollmentBillingPlan(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpsertEnrollmentBillingPlanInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const billingPlan = await this.upsertEnrollmentBillingPlanUseCase.execute(
      {
        ...input,
        enrollmentId: id,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return {
      billingPlan: toEnrollmentBillingPlanDto(billingPlan),
    };
  }

  @Post("enrollments/:id/billing-plan/generate-invoices")
  @RequirePermission("classes.cohort.billing.manage")
  async generateBillingPlanInvoices(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = GenerateBillingPlanInvoicesInputSchema.parse(body ?? {});
    const ctx = buildUseCaseContext(req);
    const result = await this.generateInvoicesFromEnrollmentBillingPlanUseCase.execute(
      {
        ...input,
        enrollmentId: id,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return GenerateBillingPlanInvoicesOutputSchema.parse({
      invoiceIds: result.invoiceIds,
      links: result.links.map(toBillingInvoiceLinkDto),
    });
  }

  @Get("class-groups/:id/milestones")
  @RequirePermission("classes.read")
  async listMilestones(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const items = await this.listMilestonesUseCase.execute({ classGroupId: id }, ctx);
    return ListMilestonesOutputSchema.parse({ items: items.map(toMilestoneDto) });
  }

  @Post("class-groups/:id/milestones")
  @RequirePermission("classes.cohort.outcomes.manage")
  async createMilestone(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = CreateMilestoneInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const milestone = await this.createMilestoneUseCase.execute(
      {
        ...input,
        classGroupId: id,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return {
      milestone: toMilestoneDto(milestone),
    };
  }

  @Patch("milestones/:id")
  @RequirePermission("classes.cohort.outcomes.manage")
  async updateMilestone(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateMilestoneInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const milestone = await this.updateMilestoneUseCase.execute({ ...input, milestoneId: id }, ctx);

    return {
      milestone: toMilestoneDto(milestone),
    };
  }

  @Delete("milestones/:id")
  @RequirePermission("classes.cohort.outcomes.manage")
  async deleteMilestone(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    await this.deleteMilestoneUseCase.execute({ milestoneId: id }, ctx);
    return { ok: true };
  }

  @Put("milestones/:id/completions/:enrollmentId")
  @RequirePermission("classes.cohort.outcomes.manage")
  async upsertMilestoneCompletion(
    @Param("id") id: string,
    @Param("enrollmentId") enrollmentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpsertMilestoneCompletionInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const completion = await this.upsertMilestoneCompletionUseCase.execute(
      { ...input, milestoneId: id, enrollmentId },
      ctx
    );

    return {
      completion: toMilestoneCompletionDto(completion),
    };
  }

  @Get("class-groups/:id/outcomes-summary")
  @RequirePermission("classes.read")
  async getOutcomesSummary(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const summary = await this.getOutcomesSummaryUseCase.execute({ classGroupId: id }, ctx);
    return GetOutcomesSummaryOutputSchema.parse({ summary });
  }

  @Get("class-groups/:id/resources")
  @RequirePermission("classes.read")
  async listResources(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const items = await this.listResourcesUseCase.execute({ classGroupId: id }, ctx);
    return ListClassGroupResourcesOutputSchema.parse({ items: items.map(toResourceDto) });
  }

  @Post("class-groups/:id/resources")
  @RequirePermission("classes.cohort.resources.manage")
  async createResource(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = CreateClassGroupResourceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const resource = await this.createResourceUseCase.execute(
      {
        ...input,
        classGroupId: id,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );

    return {
      resource: toResourceDto(resource),
    };
  }

  @Patch("resources/:id")
  @RequirePermission("classes.cohort.resources.manage")
  async updateResource(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateClassGroupResourceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const resource = await this.updateResourceUseCase.execute({ ...input, resourceId: id }, ctx);

    return {
      resource: toResourceDto(resource),
    };
  }

  @Delete("resources/:id")
  @RequirePermission("classes.cohort.resources.manage")
  async deleteResource(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    await this.deleteResourceUseCase.execute({ resourceId: id }, ctx);
    return { ok: true };
  }

  @Put("class-groups/:id/resources/reorder")
  @RequirePermission("classes.cohort.resources.manage")
  async reorderResources(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = ReorderClassGroupResourcesInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    await this.reorderResourcesUseCase.execute(
      { classGroupId: id, orderedIds: input.orderedIds },
      ctx
    );
    return { ok: true };
  }
}
