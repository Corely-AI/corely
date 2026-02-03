import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { RbacGuard, RequirePermission } from "./rbac.guard";
import { CurrentUserId } from "./current-user.decorator";
import { ListTenantsUseCase } from "../../application/use-cases/list-tenants.usecase";

@Controller("platform/tenants")
@UseGuards(AuthGuard, RbacGuard)
export class TenantsController {
  constructor(
    @Inject(ListTenantsUseCase) private readonly listTenantsUseCase: ListTenantsUseCase
  ) {}

  @Get()
  @RequirePermission("platform.tenants.manage")
  async list(@CurrentUserId() userId: string) {
    return await this.listTenantsUseCase.execute({ actorUserId: userId });
  }
}
