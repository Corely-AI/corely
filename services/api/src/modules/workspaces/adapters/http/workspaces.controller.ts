import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Param,
  Req,
  Inject,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CreateWorkspaceInputSchema,
  CreateWorkspaceDomainInputSchema,
  DeleteWorkspaceDomainOutputSchema,
  ListWorkspaceMembersOutputSchema,
  UpdateWorkspaceInputSchema,
  UpgradeWorkspaceInputSchema,
  SetPrimaryWorkspaceDomainInputSchema,
  DeleteWorkspaceInputSchema,
  DeleteWorkspaceOutputSchema,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
  type UpgradeWorkspaceInput,
} from "@corely/contracts";
import { CreateWorkspaceUseCase } from "../../application/use-cases/create-workspace.usecase";
import { ListWorkspacesUseCase } from "../../application/use-cases/list-workspaces.usecase";
import { GetWorkspaceUseCase } from "../../application/use-cases/get-workspace.usecase";
import { UpdateWorkspaceUseCase } from "../../application/use-cases/update-workspace.usecase";
import { UpgradeWorkspaceUseCase } from "../../application/use-cases/upgrade-workspace.usecase";
import { AddWorkspaceDomainUseCase } from "../../application/use-cases/add-workspace-domain.usecase";
import { DeleteWorkspaceDomainUseCase } from "../../application/use-cases/delete-workspace-domain.usecase";
import { SetPrimaryWorkspaceDomainUseCase } from "../../application/use-cases/set-primary-workspace-domain.usecase";
import { ListWorkspaceMembersUseCase } from "../../application/use-cases/list-workspace-members.usecase";
import { DeleteWorkspaceUseCase } from "../../application/use-cases/delete-workspace.usecase";
import { IdempotencyInterceptor } from "../../../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toUseCaseContext } from "../../../../shared/request-context";

// Auth context extraction - compatible with tests and production
interface AuthUser {
  id: string;
  tenantId: string;
}

function extractAuthUser(req: Request, bodyData?: any): AuthUser {
  const ctx = toUseCaseContext(req as any);
  const tenantId = ctx.tenantId ?? bodyData?.tenantId;
  const userId = ctx.userId ?? bodyData?.createdByUserId ?? bodyData?.userId;

  if (!tenantId) {
    throw new BadRequestException("Missing tenantId in request context");
  }
  if (!userId) {
    throw new BadRequestException("Missing userId in request context");
  }

  return { id: userId, tenantId };
}

@Controller("workspaces")
@UseGuards(AuthGuard)
@UseInterceptors(IdempotencyInterceptor)
export class WorkspacesController {
  constructor(
    @Inject(CreateWorkspaceUseCase)
    private readonly createWorkspace: CreateWorkspaceUseCase,
    @Inject(ListWorkspacesUseCase)
    private readonly listWorkspaces: ListWorkspacesUseCase,
    @Inject(GetWorkspaceUseCase)
    private readonly getWorkspace: GetWorkspaceUseCase,
    @Inject(UpdateWorkspaceUseCase)
    private readonly updateWorkspace: UpdateWorkspaceUseCase,
    @Inject(UpgradeWorkspaceUseCase)
    private readonly upgradeWorkspace: UpgradeWorkspaceUseCase,
    @Inject(AddWorkspaceDomainUseCase)
    private readonly addWorkspaceDomain: AddWorkspaceDomainUseCase,
    @Inject(DeleteWorkspaceDomainUseCase)
    private readonly deleteWorkspaceDomain: DeleteWorkspaceDomainUseCase,
    @Inject(SetPrimaryWorkspaceDomainUseCase)
    private readonly setPrimaryWorkspaceDomain: SetPrimaryWorkspaceDomainUseCase,
    @Inject(ListWorkspaceMembersUseCase)
    private readonly listWorkspaceMembers: ListWorkspaceMembersUseCase,
    @Inject(DeleteWorkspaceUseCase)
    private readonly deleteWorkspace: DeleteWorkspaceUseCase
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateWorkspaceInputSchema.parse(body);
    const auth = extractAuthUser(req, body);

    return this.createWorkspace.execute({
      ...input,
      tenantId: auth.tenantId,
      userId: auth.id,
      idempotencyKey: input.idempotencyKey || (req.headers["x-idempotency-key"] as string),
    });
  }

  @Get()
  async list(@Req() req: Request) {
    const auth = extractAuthUser(req, (req as any).body);

    return this.listWorkspaces.execute({
      tenantId: auth.tenantId,
      userId: auth.id,
    });
  }

  @Get(":workspaceId")
  async getById(@Param("workspaceId") workspaceId: string, @Req() req: Request) {
    const auth = extractAuthUser(req, (req as any).body);

    return this.getWorkspace.execute({
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
    });
  }

  @Get(":workspaceId/members")
  async listMembers(@Param("workspaceId") workspaceId: string, @Req() req: Request) {
    const auth = extractAuthUser(req, (req as any).body);
    const result = await this.listWorkspaceMembers.execute({
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
    });
    return ListWorkspaceMembersOutputSchema.parse(result);
  }

  @Patch(":workspaceId")
  async update(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateWorkspaceInputSchema.parse(body);
    const auth = extractAuthUser(req, body);

    return this.updateWorkspace.execute({
      ...input,
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
      idempotencyKey: input.idempotencyKey || (req.headers["x-idempotency-key"] as string),
    });
  }

  @Post(":workspaceId/upgrade")
  async upgrade(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpgradeWorkspaceInputSchema.parse(body ?? {});
    const auth = extractAuthUser(req, body as UpgradeWorkspaceInput);

    return this.upgradeWorkspace.execute({
      ...input,
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
      idempotencyKey: input.idempotencyKey || (req.headers["x-idempotency-key"] as string),
    });
  }

  @Post(":workspaceId/domains")
  async addDomain(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CreateWorkspaceDomainInputSchema.parse(body);
    const auth = extractAuthUser(req, body);

    return this.addWorkspaceDomain.execute({
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
      domain: input.domain,
    });
  }

  @Delete(":workspaceId/domains/:domainId")
  async deleteDomain(
    @Param("workspaceId") workspaceId: string,
    @Param("domainId") domainId: string,
    @Req() req: Request
  ) {
    const auth = extractAuthUser(req, (req as any).body);
    const result = await this.deleteWorkspaceDomain.execute({
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
      domainId,
    });
    return DeleteWorkspaceDomainOutputSchema.parse(result);
  }

  @Patch(":workspaceId/domains/:domainId")
  async setPrimaryDomain(
    @Param("workspaceId") workspaceId: string,
    @Param("domainId") domainId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    SetPrimaryWorkspaceDomainInputSchema.parse(body ?? {});
    const auth = extractAuthUser(req, body);

    return this.setPrimaryWorkspaceDomain.execute({
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
      domainId,
    });
  }

  @Delete(":workspaceId")
  async delete(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = DeleteWorkspaceInputSchema.parse(body ?? {});
    const auth = extractAuthUser(req, body);

    const result = await this.deleteWorkspace.execute({
      ...input,
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
    });

    return DeleteWorkspaceOutputSchema.parse(result);
  }
}
