import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Sse,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import type { Observable } from "rxjs";
import type { BillingInvoiceSendProgressEvent } from "@corely/contracts";
import {
  BulkUpsertAttendanceInputSchema,
  CreateBillingRunInputSchema,
  CreateClassGroupInputSchema,
  CreateClassSessionInputSchema,
  CreateRecurringSessionsInputSchema,
  GenerateClassGroupSessionsInputSchema,
  GetClassGroupOutputSchema,
  GetClassSessionOutputSchema,
  ListClassGroupsInputSchema,
  ListClassSessionsInputSchema,
  ListEnrollmentsInputSchema,
  UpdateClassGroupInputSchema,
  UpdateClassSessionInputSchema,
  UpsertEnrollmentInputSchema,
  UpdateEnrollmentInputSchema,
  BillingPreviewOutputSchema,
  CreateRecurringSessionsOutputSchema,
  GenerateClassGroupSessionsOutputSchema,
  GetClassesBillingSettingsOutputSchema,
  UpdateClassesBillingSettingsInputSchema,
  UpdateClassesBillingSettingsOutputSchema,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import { buildUseCaseContext, resolveIdempotencyKey } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";
import { CreateClassGroupUseCase } from "../application/use-cases/create-class-group.usecase";
import { UpdateClassGroupUseCase } from "../application/use-cases/update-class-group.usecase";
import { ListClassGroupsUseCase } from "../application/use-cases/list-class-groups.usecase";
import { GetClassGroupUseCase } from "../application/use-cases/get-class-group.usecase";
import { CreateSessionUseCase } from "../application/use-cases/create-session.usecase";
import { CreateRecurringSessionsUseCase } from "../application/use-cases/create-recurring-sessions.usecase";
import { GenerateScheduledSessionsUseCase } from "../application/use-cases/generate-scheduled-sessions.usecase";
import { UpdateSessionUseCase } from "../application/use-cases/update-session.usecase";
import { ListSessionsUseCase } from "../application/use-cases/list-sessions.usecase";
import { GetSessionUseCase } from "../application/use-cases/get-session.usecase";
import { UpsertEnrollmentUseCase } from "../application/use-cases/upsert-enrollment.usecase";
import { UpdateEnrollmentUseCase } from "../application/use-cases/update-enrollment.usecase";
import { ListEnrollmentsUseCase } from "../application/use-cases/list-enrollments.usecase";
import { BulkUpsertAttendanceUseCase } from "../application/use-cases/bulk-upsert-attendance.usecase";
import { GetSessionAttendanceUseCase } from "../application/use-cases/get-session-attendance.usecase";
import { GetMonthlyBillingPreviewUseCase } from "../application/use-cases/get-monthly-billing-preview.usecase";
import { CreateMonthlyBillingRunUseCase } from "../application/use-cases/create-monthly-billing-run.usecase";
import { LockMonthUseCase } from "../application/use-cases/lock-month.usecase";
import { GetClassesBillingSettingsUseCase } from "../application/use-cases/get-classes-billing-settings.usecase";
import { UpdateClassesBillingSettingsUseCase } from "../application/use-cases/update-classes-billing-settings.usecase";
import { GetBillingRunSendProgressUseCase } from "../application/use-cases/get-billing-run-send-progress.usecase";
import { SseStreamFactory } from "@/shared/sse";
import {
  toAttendanceDto,
  toBillingPreviewOutput,
  toBillingRunDto,
  toClassGroupDto,
  toClassSessionDto,
  toEnrollmentDto,
} from "./mappers/classes.mappers";

@Controller("classes")
@UseGuards(AuthGuard, RbacGuard)
export class ClassesController {
  constructor(
    private readonly createClassGroupUseCase: CreateClassGroupUseCase,
    private readonly updateClassGroupUseCase: UpdateClassGroupUseCase,
    private readonly listClassGroupsUseCase: ListClassGroupsUseCase,
    private readonly getClassGroupUseCase: GetClassGroupUseCase,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly createRecurringSessionsUseCase: CreateRecurringSessionsUseCase,
    private readonly generateScheduledSessionsUseCase: GenerateScheduledSessionsUseCase,
    private readonly updateSessionUseCase: UpdateSessionUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly upsertEnrollmentUseCase: UpsertEnrollmentUseCase,
    private readonly updateEnrollmentUseCase: UpdateEnrollmentUseCase,
    private readonly listEnrollmentsUseCase: ListEnrollmentsUseCase,
    private readonly bulkUpsertAttendanceUseCase: BulkUpsertAttendanceUseCase,
    private readonly getSessionAttendanceUseCase: GetSessionAttendanceUseCase,
    private readonly getMonthlyBillingPreviewUseCase: GetMonthlyBillingPreviewUseCase,
    private readonly getBillingRunSendProgressUseCase: GetBillingRunSendProgressUseCase,
    private readonly createMonthlyBillingRunUseCase: CreateMonthlyBillingRunUseCase,
    private readonly lockMonthUseCase: LockMonthUseCase,
    private readonly getClassesBillingSettingsUseCase: GetClassesBillingSettingsUseCase,
    private readonly updateClassesBillingSettingsUseCase: UpdateClassesBillingSettingsUseCase,
    private readonly sseStreamFactory: SseStreamFactory
  ) {}

  // Class Groups
  @Get("class-groups")
  @RequirePermission("classes.read")
  async listGroups(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListClassGroupsInputSchema.parse({
      ...listQuery,
      status: typeof query.status === "string" ? query.status : undefined,
      subject: typeof query.subject === "string" ? query.subject : undefined,
      level: typeof query.level === "string" ? query.level : undefined,
      kind: typeof query.kind === "string" ? query.kind : undefined,
      lifecycle: typeof query.lifecycle === "string" ? query.lifecycle : undefined,
      startAtFrom: typeof query.startAtFrom === "string" ? query.startAtFrom : undefined,
      startAtTo: typeof query.startAtTo === "string" ? query.startAtTo : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.listClassGroupsUseCase.execute(
      { ...input, page: listQuery.page, pageSize: listQuery.pageSize },
      ctx
    );
    return {
      items: result.items.map(toClassGroupDto),
      pageInfo: result.pageInfo,
    };
  }

  @Post("class-groups")
  @RequirePermission("classes.write")
  async createGroup(@Body() body: unknown, @Req() req: Request) {
    const input = CreateClassGroupInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const created = await this.createClassGroupUseCase.execute(
      {
        ...input,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );
    return GetClassGroupOutputSchema.parse({ classGroup: toClassGroupDto(created) });
  }

  @Get("class-groups/:id")
  @RequirePermission("classes.read")
  async getGroup(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const group = await this.getClassGroupUseCase.execute({ classGroupId: id }, ctx);
    return GetClassGroupOutputSchema.parse({ classGroup: toClassGroupDto(group) });
  }

  @Patch("class-groups/:id")
  @RequirePermission("classes.write")
  async updateGroup(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateClassGroupInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const updated = await this.updateClassGroupUseCase.execute({ ...input, classGroupId: id }, ctx);
    return GetClassGroupOutputSchema.parse({ classGroup: toClassGroupDto(updated) });
  }

  // Sessions
  @Get("sessions")
  @RequirePermission("classes.read")
  async listSessions(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListClassSessionsInputSchema.parse({
      ...listQuery,
      classGroupId: typeof query.classGroupId === "string" ? query.classGroupId : undefined,
      status: typeof query.status === "string" ? query.status : undefined,
      type: typeof query.type === "string" ? query.type : undefined,
      dateFrom: typeof query.dateFrom === "string" ? query.dateFrom : undefined,
      dateTo: typeof query.dateTo === "string" ? query.dateTo : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.listSessionsUseCase.execute(
      { ...input, page: listQuery.page, pageSize: listQuery.pageSize },
      ctx
    );
    return {
      items: result.items.map(toClassSessionDto),
      pageInfo: result.pageInfo,
    };
  }

  @Post("sessions")
  @RequirePermission("classes.write")
  async createSession(@Body() body: unknown, @Req() req: Request) {
    const input = CreateClassSessionInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const created = await this.createSessionUseCase.execute(
      { ...input, idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey },
      ctx
    );
    return GetClassSessionOutputSchema.parse({ session: toClassSessionDto(created) });
  }

  @Post("sessions/recurring")
  @RequirePermission("classes.write")
  async createRecurring(@Body() body: unknown, @Req() req: Request) {
    const input = CreateRecurringSessionsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const created = await this.createRecurringSessionsUseCase.execute(
      { ...input, idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey },
      ctx
    );
    return CreateRecurringSessionsOutputSchema.parse({ items: created.map(toClassSessionDto) });
  }

  @Post("class-groups/:id/sessions/generate")
  @RequirePermission("classes.write")
  async generateScheduledSessions(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = GenerateClassGroupSessionsInputSchema.parse(body ?? {});
    const ctx = buildUseCaseContext(req);
    const created = await this.generateScheduledSessionsUseCase.execute(
      { ...input, classGroupId: id },
      ctx
    );
    return GenerateClassGroupSessionsOutputSchema.parse({ items: created.map(toClassSessionDto) });
  }

  @Get("sessions/:id")
  @RequirePermission("classes.read")
  async getSession(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const session = await this.getSessionUseCase.execute({ sessionId: id }, ctx);
    return GetClassSessionOutputSchema.parse({ session: toClassSessionDto(session) });
  }

  @Patch("sessions/:id")
  @RequirePermission("classes.write")
  async updateSession(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateClassSessionInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const updated = await this.updateSessionUseCase.execute({ ...input, sessionId: id }, ctx);
    return GetClassSessionOutputSchema.parse({ session: toClassSessionDto(updated) });
  }

  // Enrollments
  @Get("enrollments")
  @RequirePermission("classes.read")
  async listEnrollments(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListEnrollmentsInputSchema.parse({
      ...listQuery,
      classGroupId: typeof query.classGroupId === "string" ? query.classGroupId : undefined,
      studentClientId:
        typeof query.studentClientId === "string" ? query.studentClientId : undefined,
      payerClientId: typeof query.payerClientId === "string" ? query.payerClientId : undefined,
      payerPartyId: typeof query.payerPartyId === "string" ? query.payerPartyId : undefined,
      status: typeof query.status === "string" ? query.status : undefined,
      seatType: typeof query.seatType === "string" ? query.seatType : undefined,
      isActive:
        typeof query.isActive === "string"
          ? query.isActive === "true" || query.isActive === "1"
          : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.listEnrollmentsUseCase.execute(
      { ...input, page: listQuery.page, pageSize: listQuery.pageSize },
      ctx
    );
    return {
      items: result.items.map(toEnrollmentDto),
      pageInfo: result.pageInfo,
    };
  }

  @Post("enrollments")
  @RequirePermission("classes.write")
  async upsertEnrollment(@Body() body: unknown, @Req() req: Request) {
    const input = UpsertEnrollmentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const saved = await this.upsertEnrollmentUseCase.execute(
      { ...input, idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey },
      ctx
    );
    return { enrollment: toEnrollmentDto(saved) };
  }

  @Patch("enrollments/:id")
  @RequirePermission("classes.write")
  async updateEnrollment(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateEnrollmentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const saved = await this.updateEnrollmentUseCase.execute({ ...input, enrollmentId: id }, ctx);
    return { enrollment: toEnrollmentDto(saved) };
  }

  // Attendance
  @Get("sessions/:id/attendance")
  @RequirePermission("classes.read")
  async getAttendance(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getSessionAttendanceUseCase.execute({ sessionId: id }, ctx);
    return { items: result.items.map(toAttendanceDto), locked: result.locked };
  }

  @Put("sessions/:id/attendance")
  @RequirePermission("classes.write")
  async upsertAttendance(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = BulkUpsertAttendanceInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const items = await this.bulkUpsertAttendanceUseCase.execute(
      {
        ...input,
        sessionId: id,
        idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey,
      },
      ctx
    );
    return { items: items.map(toAttendanceDto) };
  }

  // Settings
  @Get("settings")
  @RequirePermission("classes.billing")
  async getSettings(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.getClassesBillingSettingsUseCase.execute(ctx);
    return GetClassesBillingSettingsOutputSchema.parse(result);
  }

  @Patch("settings")
  @RequirePermission("classes.billing")
  async updateSettings(@Body() body: unknown, @Req() req: Request) {
    const input = UpdateClassesBillingSettingsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.updateClassesBillingSettingsUseCase.execute(input, ctx);
    return UpdateClassesBillingSettingsOutputSchema.parse(result);
  }

  // Billing
  @Get("billing/preview")
  @RequirePermission("classes.billing")
  async previewBilling(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const month = typeof query.month === "string" ? query.month : "";
    const classGroupId = typeof query.classGroupId === "string" ? query.classGroupId : undefined;
    const payerClientId = typeof query.payerClientId === "string" ? query.payerClientId : undefined;
    const ctx = buildUseCaseContext(req);
    const preview = await this.getMonthlyBillingPreviewUseCase.execute(
      { month, classGroupId, payerClientId },
      ctx
    );
    return BillingPreviewOutputSchema.parse(toBillingPreviewOutput(preview));
  }

  @Post("billing/runs")
  @RequirePermission("classes.billing")
  async createBillingRun(@Body() body: unknown, @Req() req: Request) {
    const input = CreateBillingRunInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.createMonthlyBillingRunUseCase.execute(
      { ...input, idempotencyKey: resolveIdempotencyKey(req) ?? input.idempotencyKey },
      ctx
    );
    return {
      billingRun: toBillingRunDto(result.billingRun),
      invoiceIds: result.invoiceIds,
    };
  }

  @Post("billing/runs/:id/lock")
  @RequirePermission("classes.billing")
  async lockBilling(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const run = await this.lockMonthUseCase.execute({ billingRunId: id }, ctx);
    return { billingRun: toBillingRunDto(run) };
  }

  @Sse("billing/runs/:billingRunId/send-progress/stream")
  @RequirePermission("classes.billing")
  streamBillingSendProgress(
    @Param("billingRunId") billingRunId: string,
    @Req() req: Request
  ): Observable<MessageEvent> {
    const ctx = buildUseCaseContext(req);
    return this.sseStreamFactory.createPollingStream<BillingInvoiceSendProgressEvent>(req, {
      event: "billing.invoice-send-progress",
      intervalMs: 1_500,
      timeoutMs: 90_000,
      fetchSnapshot: () => this.getBillingRunSendProgressUseCase.execute({ billingRunId }, ctx),
      isComplete: (snapshot) => snapshot.isComplete,
      toEnvelope: (payload) => payload,
      emitOnChangeOnly: true,
      hash: (snapshot) =>
        JSON.stringify({
          progress: snapshot.progress,
          isComplete: snapshot.isComplete,
        }),
    });
  }
}
