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
  AddFieldInputSchema,
  CreateFormInputSchema,
  GetFormSubmissionOutputSchema,
  GetFormOutputSchema,
  ListFormSubmissionsOutputSchema,
  ListFormsOutputSchema,
  PublishFormInputSchema,
  PublishFormOutputSchema,
  ReorderFieldsInputSchema,
  UpdateFieldInputSchema,
  UpdateFormInputSchema,
  FormSubmissionSummarySchema,
  type FormDefinitionDto,
  type FormFieldDto,
  type FormSubmissionDto,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { CreateFormUseCase } from "../application/use-cases/create-form.usecase";
import { UpdateFormUseCase } from "../application/use-cases/update-form.usecase";
import { DeleteFormUseCase } from "../application/use-cases/delete-form.usecase";
import { GetFormUseCase } from "../application/use-cases/get-form.usecase";
import { ListFormsUseCase } from "../application/use-cases/list-forms.usecase";
import { AddFieldUseCase } from "../application/use-cases/add-field.usecase";
import { UpdateFieldUseCase } from "../application/use-cases/update-field.usecase";
import { RemoveFieldUseCase } from "../application/use-cases/remove-field.usecase";
import { ReorderFieldsUseCase } from "../application/use-cases/reorder-fields.usecase";
import { PublishFormUseCase } from "../application/use-cases/publish-form.usecase";
import { UnpublishFormUseCase } from "../application/use-cases/unpublish-form.usecase";
import { ListFormSubmissionsUseCase } from "../application/use-cases/list-submissions.usecase";
import { GetFormSubmissionUseCase } from "../application/use-cases/get-submission.usecase";
import { FormSubmissionSummaryUseCase } from "../application/use-cases/submission-summary.usecase";
import type { FormDefinition, FormField, FormSubmission } from "../domain/form-definition.entity";

@Controller("forms")
@UseGuards(AuthGuard, RbacGuard)
export class FormsController {
  constructor(
    private readonly createFormUseCase: CreateFormUseCase,
    private readonly updateFormUseCase: UpdateFormUseCase,
    private readonly deleteFormUseCase: DeleteFormUseCase,
    private readonly getFormUseCase: GetFormUseCase,
    private readonly listFormsUseCase: ListFormsUseCase,
    private readonly addFieldUseCase: AddFieldUseCase,
    private readonly updateFieldUseCase: UpdateFieldUseCase,
    private readonly removeFieldUseCase: RemoveFieldUseCase,
    private readonly reorderFieldsUseCase: ReorderFieldsUseCase,
    private readonly publishFormUseCase: PublishFormUseCase,
    private readonly unpublishFormUseCase: UnpublishFormUseCase,
    private readonly listSubmissionsUseCase: ListFormSubmissionsUseCase,
    private readonly getSubmissionUseCase: GetFormSubmissionUseCase,
    private readonly submissionSummaryUseCase: FormSubmissionSummaryUseCase
  ) {}

  @Post()
  @RequirePermission("forms.manage")
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateFormInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const form = await this.createFormUseCase.execute(input, ctx);
    return GetFormOutputSchema.parse({ form: this.mapFormDefinitionDto(form) });
  }

  @Get()
  @RequirePermission("forms.read")
  async list(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const ctx = buildUseCaseContext(req);
    const statusParam = typeof query.status === "string" ? query.status : undefined;
    const status = statusParam === "DRAFT" || statusParam === "PUBLISHED" ? statusParam : undefined;

    const result = await this.listFormsUseCase.execute(
      {
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        q: listQuery.q,
        sort: listQuery.sort as string | undefined,
        status,
        includeArchived: listQuery.includeArchived,
        cursor: typeof query.cursor === "string" ? query.cursor : undefined,
        filters: listQuery.filters,
      },
      ctx
    );

    return ListFormsOutputSchema.parse({
      items: result.items.map((form) => this.mapFormDefinitionDto(form)),
      pageInfo: result.pageInfo,
      nextCursor: result.nextCursor,
    });
  }

  @Get(":formId")
  @RequirePermission("forms.read")
  async get(@Param("formId") formId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const form = await this.getFormUseCase.execute(formId, ctx);
    return GetFormOutputSchema.parse({ form: this.mapFormDefinitionDto(form) });
  }

  @Patch(":formId")
  @RequirePermission("forms.manage")
  async update(@Param("formId") formId: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateFormInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const form = await this.updateFormUseCase.execute(formId, input, ctx);
    return GetFormOutputSchema.parse({ form: this.mapFormDefinitionDto(form) });
  }

  @Delete(":formId")
  @RequirePermission("forms.manage")
  async delete(@Param("formId") formId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    await this.deleteFormUseCase.execute(formId, ctx);
    return { archived: true };
  }

  @Post(":formId/fields")
  @RequirePermission("forms.manage")
  async addField(@Param("formId") formId: string, @Body() body: unknown, @Req() req: Request) {
    const input = AddFieldInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const form = await this.addFieldUseCase.execute(formId, input, ctx);
    return { form: this.mapFormDefinitionDto(form) };
  }

  @Patch(":formId/fields/:fieldId")
  @RequirePermission("forms.manage")
  async updateField(
    @Param("formId") formId: string,
    @Param("fieldId") fieldId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateFieldInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const form = await this.updateFieldUseCase.execute(formId, fieldId, input, ctx);
    return { form: this.mapFormDefinitionDto(form) };
  }

  @Delete(":formId/fields/:fieldId")
  @RequirePermission("forms.manage")
  async removeField(
    @Param("formId") formId: string,
    @Param("fieldId") fieldId: string,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const form = await this.removeFieldUseCase.execute(formId, fieldId, ctx);
    return { form: this.mapFormDefinitionDto(form) };
  }

  @Post(":formId/fields/reorder")
  @RequirePermission("forms.manage")
  async reorderFields(@Param("formId") formId: string, @Body() body: unknown, @Req() req: Request) {
    const input = ReorderFieldsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const form = await this.reorderFieldsUseCase.execute(formId, input, ctx);
    return { form: this.mapFormDefinitionDto(form) };
  }

  @Post(":formId/publish")
  @RequirePermission("forms.manage")
  async publish(@Param("formId") formId: string, @Body() body: unknown, @Req() req: Request) {
    const input = PublishFormInputSchema.parse(body ?? {});
    const ctx = buildUseCaseContext(req);
    const { publicId, token } = await this.publishFormUseCase.execute(formId, input, ctx);
    const origin = req.get("origin");
    const base = origin ?? `${req.protocol}://${req.get("host")}`;
    const url = `${base}/f/${publicId}`;
    return PublishFormOutputSchema.parse({ publicId, token, url });
  }

  @Post(":formId/unpublish")
  @RequirePermission("forms.manage")
  async unpublish(@Param("formId") formId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const form = await this.unpublishFormUseCase.execute(formId, ctx);
    return { form: this.mapFormDefinitionDto(form) };
  }

  @Get(":formId/submissions")
  @RequirePermission("forms.submissions.read")
  async listSubmissions(
    @Param("formId") formId: string,
    @Query() query: Record<string, unknown>,
    @Req() req: Request
  ) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const ctx = buildUseCaseContext(req);
    const sourceParam = typeof query.source === "string" ? query.source : undefined;
    const source = sourceParam === "PUBLIC" || sourceParam === "INTERNAL" ? sourceParam : undefined;

    const result = await this.listSubmissionsUseCase.execute(
      formId,
      {
        page: listQuery.page,
        pageSize: listQuery.pageSize,
        q: listQuery.q,
        sort: listQuery.sort as string | undefined,
        source,
        cursor: typeof query.cursor === "string" ? query.cursor : undefined,
        filters: listQuery.filters,
      },
      ctx
    );

    return ListFormSubmissionsOutputSchema.parse({
      items: result.items.map((submission) => this.mapSubmissionDto(submission)),
      pageInfo: result.pageInfo,
      nextCursor: result.nextCursor,
    });
  }

  @Get(":formId/submissions/summary")
  @RequirePermission("forms.submissions.read")
  async submissionSummary(
    @Param("formId") formId: string,
    @Query("last") last: string | undefined,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const lastNumber = typeof last === "string" ? Number(last) : undefined;
    const summary = await this.submissionSummaryUseCase.execute(
      formId,
      Number.isFinite(lastNumber) ? lastNumber : undefined,
      ctx
    );
    return FormSubmissionSummarySchema.parse({
      count: summary.count,
      lastSubmittedAt: summary.lastSubmittedAt ? summary.lastSubmittedAt.toISOString() : null,
      keyCounts: summary.keyCounts,
    });
  }

  @Get(":formId/submissions/:submissionId")
  @RequirePermission("forms.submissions.read")
  async getSubmission(
    @Param("formId") formId: string,
    @Param("submissionId") submissionId: string,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const submission = await this.getSubmissionUseCase.execute(formId, submissionId, ctx);
    return GetFormSubmissionOutputSchema.parse({
      submission: this.mapSubmissionDto(submission),
    });
  }

  private mapFormDefinitionDto(form: FormDefinition): FormDefinitionDto {
    return {
      id: form.id,
      tenantId: form.tenantId,
      name: form.name,
      description: form.description ?? null,
      status: form.status,
      publicId: form.publicId ?? null,
      publishedAt: form.publishedAt ? form.publishedAt.toISOString() : null,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString(),
      archivedAt: form.archivedAt ? form.archivedAt.toISOString() : null,
      fields: form.fields ? form.fields.map((field) => this.mapFormFieldDto(field)) : undefined,
    };
  }

  private mapFormFieldDto(field: FormField): FormFieldDto {
    return {
      id: field.id,
      tenantId: field.tenantId,
      formId: field.formId,
      key: field.key,
      label: field.label,
      type: field.type,
      required: field.required,
      helpText: field.helpText ?? null,
      order: field.order,
      configJson: field.configJson ?? null,
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString(),
    };
  }

  private mapSubmissionDto(submission: FormSubmission): FormSubmissionDto {
    return {
      id: submission.id,
      tenantId: submission.tenantId,
      formId: submission.formId,
      source: submission.source,
      payloadJson: submission.payloadJson,
      submittedAt: submission.submittedAt.toISOString(),
      createdAt: submission.createdAt.toISOString(),
      createdByUserId: submission.createdByUserId ?? null,
    };
  }
}
