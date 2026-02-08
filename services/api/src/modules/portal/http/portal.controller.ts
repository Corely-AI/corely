import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { PortalApplication } from "../application/portal.application";
import { buildUseCaseContext, mapResultToHttp } from "../../../shared/http/usecase-mappers";
import { AuthGuard, RbacGuard, RequirePermission } from "../../identity";

@Controller("portal")
export class PortalController {
  constructor(private readonly app: PortalApplication) {}

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getMe.execute(undefined, ctx);
    return mapResultToHttp(result);
  }

  @Get("students/:studentId/classes")
  @UseGuards(AuthGuard)
  async getStudentClasses(@Param("studentId") studentId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getStudentClasses.execute({ studentId }, ctx);
    return mapResultToHttp(result);
  }

  @Get("students/:studentId/materials")
  @UseGuards(AuthGuard)
  async getStudentMaterials(@Param("studentId") studentId: string, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getStudentMaterials.execute({ studentId }, ctx);
    return mapResultToHttp(result);
  }

  @Get("materials/:documentId/download-url")
  @UseGuards(AuthGuard)
  async getDownloadUrl(
    @Param("documentId") documentId: string,
    @Query("studentId") studentId: string,
    @Req() req: Request
  ) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDownloadUrl.execute({ studentId, documentId }, ctx);
    return mapResultToHttp(result);
  }

  @Post("invitations")
  @UseGuards(AuthGuard, RbacGuard)
  @RequirePermission("party.write")
  async inviteUser(@Body() body: any, @Req() req: Request) {
    const ctx = buildUseCaseContext(req);
    const result = await this.app.inviteUser.execute(body, ctx);
    return mapResultToHttp(result);
  }
}
