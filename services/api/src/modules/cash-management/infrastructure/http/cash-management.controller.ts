import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateCashRegisterSchema,
  CreateCashEntrySchema,
  ReverseCashEntrySchema,
  SubmitDailyCloseSchema,
  UpdateCashRegisterSchema,
} from "@corely/contracts";
import { buildUseCaseContext } from "../../../../shared/http/usecase-mappers";
import { CreateRegisterUseCase } from "../../application/use-cases/create-register.usecase";
import { AddEntryUseCase } from "../../application/use-cases/add-entry.usecase";
import { ReverseEntryUseCase } from "../../application/use-cases/reverse-entry.usecase";
import { SubmitDailyCloseUseCase } from "../../application/use-cases/submit-daily-close.usecase";
import {
  type CashRepositoryPort,
  CASH_REPOSITORY,
} from "../../application/ports/cash-repository.port";
import { Inject } from "@nestjs/common";
import { type Result } from "@corely/kernel";

@Controller()
export class CashManagementController {
  constructor(
    private readonly createRegisterUC: CreateRegisterUseCase,
    private readonly addEntryUC: AddEntryUseCase,
    private readonly reverseEntryUC: ReverseEntryUseCase,
    private readonly submitDailyCloseUC: SubmitDailyCloseUseCase,
    @Inject(CASH_REPOSITORY) private readonly repository: CashRepositoryPort
  ) {}

  // --- REGISTERS ---

  @Post("cash-registers")
  async createRegister(@Body() body: unknown, @Req() req: Request) {
    const input = CreateCashRegisterSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;

    if (!tenantId || !workspaceId) {
      throw new BadRequestException("Missing context");
    }

    const result = await this.createRegisterUC.execute(
      {
        ...input,
        tenantId,
      },
      ctx
    );

    return { register: this.unwrap(result) };
  }

  @Get("cash-registers")
  async listRegisters(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    if (!ctx.tenantId || !ctx.workspaceId) {
      throw new BadRequestException("Missing context");
    }

    const registers = await this.repository.findAll(ctx.tenantId, ctx.workspaceId);
    return { registers };
  }

  @Get("cash-registers/:id")
  async getRegister(@Param("id") id: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    if (!ctx.tenantId) {
      throw new BadRequestException("Missing context");
    }

    const register = await this.repository.findById(ctx.tenantId, id);
    if (!register) {
      throw new BadRequestException("Not found");
    } // Should be 404
    return { register };
  }

  @Patch("cash-registers/:id")
  async updateRegister(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const input = UpdateCashRegisterSchema.parse(body);
    if (!ctx.tenantId) {
      throw new BadRequestException("Missing context");
    }

    const register = await this.repository.updateRegister(ctx.tenantId, id, input);
    return { register };
  }

  // --- ENTRIES ---

  @Post("cash-registers/:id/entries")
  async createEntry(@Param("id") registerId: string, @Body() body: unknown, @Req() req: Request) {
    const rawInput = CreateCashEntrySchema.parse(body);
    if (rawInput.registerId && rawInput.registerId !== registerId) {
      throw new BadRequestException("Register ID mismatch");
    }

    const ctx = buildUseCaseContext(req);
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      throw new BadRequestException("Missing context");
    }

    const result = await this.addEntryUC.execute(
      {
        ...rawInput,
        registerId, // Force from URL
        tenantId: ctx.tenantId,
      },
      ctx
    );

    return { entry: this.unwrap(result) };
  }

  @Get("cash-registers/:id/entries")
  async listEntries(
    @Param("id") registerId: string,
    @Req() req: Request,
    @Query() query: { from?: string; to?: string }
  ) {
    const ctx = buildUseCaseContext(req);
    if (!ctx.tenantId) {
      throw new BadRequestException("Missing context");
    }

    const entries = await this.repository.findEntries(ctx.tenantId, registerId, {
      from: query.from,
      to: query.to,
    });
    return { entries };
  }

  @Post("cash-entries/:id/reverse")
  async reverseEntry(@Param("id") entryId: string, @Body() body: unknown, @Req() req: Request) {
    const rawInput = ReverseCashEntrySchema.parse(body);
    if (rawInput.originalEntryId && rawInput.originalEntryId !== entryId) {
      throw new BadRequestException("Entry ID mismatch");
    }

    const ctx = buildUseCaseContext(req);
    if (!ctx.tenantId || !ctx.userId) {
      throw new BadRequestException("Missing context");
    }

    const result = await this.reverseEntryUC.execute(
      {
        originalEntryId: entryId,
        tenantId: ctx.tenantId,
        reason: rawInput.reason,
      },
      ctx
    );

    return { entry: this.unwrap(result) };
  }

  // --- DAILY CLOSE ---

  @Post("cash-registers/:id/daily-close")
  async dailyClose(@Param("id") registerId: string, @Body() body: unknown, @Req() req: Request) {
    const rawInput = SubmitDailyCloseSchema.parse(body);
    if (rawInput.registerId && rawInput.registerId !== registerId) {
      throw new BadRequestException("Register ID mismatch");
    }

    const ctx = buildUseCaseContext(req);
    if (!ctx.tenantId || !ctx.workspaceId || !ctx.userId) {
      throw new BadRequestException("Missing context");
    }

    const result = await this.submitDailyCloseUC.execute(
      {
        ...rawInput,
        registerId,
        tenantId: ctx.tenantId,
      },
      ctx
    );

    return { close: this.unwrap(result) };
  }

  @Get("cash-registers/:id/daily-close")
  async listDailyCloses(
    @Param("id") registerId: string,
    @Req() req: Request,
    @Query() query: { from?: string; to?: string }
  ) {
    const ctx = buildUseCaseContext(req);
    if (!ctx.tenantId) {
      throw new BadRequestException("Missing context");
    }

    const closes = await this.repository.findDailyCloses(
      ctx.tenantId,
      registerId,
      query.from ?? "1900-01-01",
      query.to ?? "2100-01-01"
    );
    return { closes };
  }

  private unwrap<T>(result: Result<T, any>): T {
    if ("error" in result) {
      throw result.error;
    }
    return result.value;
  }
}
