import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  UseFilters,
} from "@nestjs/common";
import {
  CliGrantScopeSchema,
  CliTaskAssigneesOperation,
  CliTaskCreateInputSchema,
  CliTaskCreateOperation,
} from "@corely/contracts";
import type { Request } from "express";
import { CliOperationAccess, SsoExceptionFilter } from "../../../identity/public/cli";
import { EmployeeTasksUseCase } from "../../application/employee-tasks.usecase";

const createSchema = CliGrantScopeSchema.extend({ task: CliTaskCreateInputSchema });

@Controller("sso/cli/tasks")
@UseFilters(SsoExceptionFilter)
export class CliTaskController {
  constructor(
    @Inject(EmployeeTasksUseCase) private readonly tasks: EmployeeTasksUseCase,
    @Inject(CliOperationAccess) private readonly access: CliOperationAccess
  ) {}

  @Post("assignees")
  @HttpCode(200)
  assignees(@Req() req: Request, @Body() raw: unknown) {
    const parsed = CliGrantScopeSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException("Choose a workspace");
    }
    const { tenantId, workspaceId } = parsed.data;
    const scope = { tenantId, workspaceId };
    return this.access.run(req, scope, CliTaskAssigneesOperation.id, ({ userId }) =>
      this.tasks.assignees({ ...scope, userId })
    );
  }

  @Post("create")
  @HttpCode(200)
  create(@Req() req: Request, @Body() raw: unknown) {
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      throw new BadRequestException("Enter a title, active assignee, due time and idempotency key");
    }
    const {
      tenantId,
      workspaceId,
      task: { idempotencyKey, ...task },
    } = parsed.data;
    const scope = { tenantId, workspaceId };
    return this.access.run(req, scope, CliTaskCreateOperation.id, async (actor, transaction) => {
      const saved = await this.tasks.command(
        "create",
        null,
        task,
        idempotencyKey,
        { ...scope, userId: actor.userId },
        undefined,
        actor.agentId && transaction ? { agentId: actor.agentId, transaction } : undefined
      );
      return {
        id: saved.id,
        status: saved.status,
        ownerStaffId: saved.ownerStaffId,
        dueAt: saved.dueAt,
        sourcePath: `/openbuk/app/tasks?${new URLSearchParams({ taskId: saved.id, workspaceId })}`,
      };
    });
  }
}
