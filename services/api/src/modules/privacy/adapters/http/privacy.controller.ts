import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import type { RequestPersonalDataExportUseCase } from "../../application/use-cases/request-personal-data-export/request-personal-data-export.usecase";
import type { RequestAccountErasureUseCase } from "../../application/use-cases/request-account-erasure/request-account-erasure.usecase";
import type { GetPrivacyRequestStatusUseCase } from "../../application/use-cases/get-privacy-request-status/get-privacy-request-status.usecase";
import type { Request } from "express";

@Controller("privacy")
export class PrivacyController {
  constructor(
    private readonly exportUseCase: RequestPersonalDataExportUseCase,
    private readonly eraseUseCase: RequestAccountErasureUseCase,
    private readonly statusUseCase: GetPrivacyRequestStatusUseCase
  ) {}

  @Post("export")
  async export(@Body() body: any, @Req() req: Request) {
    const tenantId = (req.headers["x-tenant-id"] as string) ?? body.tenantId;
    const subjectUserId = body.subjectUserId ?? (req as any).user?.id;
    const requestedByUserId = (req as any).user?.id ?? subjectUserId;
    return this.exportUseCase.execute({ tenantId, subjectUserId, requestedByUserId });
  }

  @Post("erase")
  async erase(@Body() body: any, @Req() req: Request) {
    const tenantId = (req.headers["x-tenant-id"] as string) ?? body.tenantId;
    const subjectUserId = body.subjectUserId ?? (req as any).user?.id;
    const requestedByUserId = (req as any).user?.id ?? subjectUserId;
    return this.eraseUseCase.execute({ tenantId, subjectUserId, requestedByUserId });
  }

  @Get("requests/:id")
  async status(@Param("id") id: string, @Req() req: Request) {
    const tenantId = (req.headers["x-tenant-id"] as string) ?? (req.query.tenantId as string);
    return this.statusUseCase.execute({ tenantId, requestId: id });
  }
}
