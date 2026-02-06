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
  ArchiveCustomerInputSchema,
  CreateCustomerInputSchema,
  GetCustomerInputSchema,
  LinkGuardianInputSchema,
  ListCustomersInputSchema,
  ListStudentGuardiansInputSchema,
  SearchCustomersInputSchema,
  SetPrimaryPayerInputSchema,
  UnarchiveCustomerInputSchema,
  UpdateCustomerInputSchema,
} from "@corely/contracts";
import { PartyApplication } from "../../application/party.application";
import {
  buildUseCaseContext,
  mapResultToHttp,
  resolveIdempotencyKey,
} from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("customers")
@UseGuards(AuthGuard, RbacGuard)
export class CustomersHttpController {
  constructor(private readonly app: PartyApplication) {}

  @Post()
  @RequirePermission("party.customers.manage")
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateCustomerInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createCustomer.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Patch(":id")
  @RequirePermission("party.customers.manage")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Query() query: any,
    @Req() req: Request
  ) {
    const input = UpdateCustomerInputSchema.parse({
      id,
      role: typeof query.role === "string" ? query.role : undefined,
      patch: body as object,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateCustomer.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Post(":id/archive")
  @RequirePermission("party.customers.manage")
  async archive(@Param("id") id: string, @Query() query: any, @Req() req: Request) {
    const input = ArchiveCustomerInputSchema.parse({
      id,
      role: typeof query.role === "string" ? query.role : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.archiveCustomer.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Post(":id/unarchive")
  @RequirePermission("party.customers.manage")
  async unarchive(@Param("id") id: string, @Query() query: any, @Req() req: Request) {
    const input = UnarchiveCustomerInputSchema.parse({
      id,
      role: typeof query.role === "string" ? query.role : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.unarchiveCustomer.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Get("search")
  @RequirePermission("party.customers.read")
  async search(@Query() query: any, @Req() req: Request) {
    const input = SearchCustomersInputSchema.parse({
      q: query.q,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      role: typeof query.role === "string" ? query.role : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.searchCustomers.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("students")
  @RequirePermission("party.customers.read")
  async listStudents(@Query() query: any, @Req() req: Request) {
    const input = ListCustomersInputSchema.parse({
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      includeArchived: query.includeArchived === "true" || query.includeArchived === true,
      role: "STUDENT",
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listCustomers.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":id")
  @RequirePermission("party.customers.read")
  async get(@Param("id") id: string, @Req() req: Request) {
    const input = GetCustomerInputSchema.parse({
      id,
      role: typeof req.query?.role === "string" ? req.query.role : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getCustomerById.execute(input, ctx);
    return mapResultToHttp(result).customer;
  }

  @Get()
  @RequirePermission("party.customers.read")
  async list(@Query() query: any, @Req() req: Request) {
    const input = ListCustomersInputSchema.parse({
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      includeArchived: query.includeArchived === "true" || query.includeArchived === true,
      role: typeof query.role === "string" ? query.role : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listCustomers.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":id/guardians")
  @RequirePermission("party.customers.read")
  async listGuardians(@Param("id") id: string, @Req() req: Request) {
    const input = ListStudentGuardiansInputSchema.parse({ studentId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getStudentGuardians.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":id/guardians")
  @RequirePermission("party.customers.manage")
  async linkGuardian(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const parsed = LinkGuardianInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.linkGuardianToStudent.execute(
      {
        studentId: id,
        ...parsed,
        idempotencyKey: resolveIdempotencyKey(req) ?? parsed.idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Delete(":id/guardians/:guardianId")
  @RequirePermission("party.customers.manage")
  async unlinkGuardian(
    @Param("id") id: string,
    @Param("guardianId") guardianId: string,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.unlinkGuardian.execute(
      { studentId: id, guardianClientId: guardianId },
      ctx
    );
    return mapResultToHttp(result);
  }

  @Post(":id/primary-payer")
  @RequirePermission("party.customers.manage")
  async setPrimaryPayer(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const parsed = SetPrimaryPayerInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.setPrimaryPayer.execute(
      {
        studentId: id,
        ...parsed,
        idempotencyKey: resolveIdempotencyKey(req) ?? parsed.idempotencyKey,
      },
      ctx
    );
    return mapResultToHttp(result);
  }
}
