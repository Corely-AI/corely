import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CommunicationWebhookInputSchema,
  CreateCommunicationDraftInputSchema,
  LogCommunicationInputSchema,
  SendCommunicationInputSchema,
} from "@corely/contracts";
import { CrmApplication } from "../../application/crm.application";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";

@Controller("crm/communications")
@UseGuards(AuthGuard, RbacGuard)
export class CommunicationsHttpController {
  constructor(private readonly app: CrmApplication) {}

  @Post("draft")
  @RequirePermission("crm.activities.manage")
  async draft(@Body() body: unknown, @Req() req: Request) {
    const input = CreateCommunicationDraftInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createCommunicationDraft.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":id/send")
  @RequirePermission("crm.activities.manage")
  async send(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = SendCommunicationInputSchema.parse({
      communicationId: id,
      ...(body as Record<string, unknown>),
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.sendCommunication.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("log")
  @RequirePermission("crm.activities.manage")
  async log(@Body() body: unknown, @Req() req: Request) {
    const input = LogCommunicationInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.logCommunication.execute(input, ctx);
    return mapResultToHttp(result);
  }
}

@Controller("webhooks")
export class CommunicationsWebhookController {
  constructor(private readonly app: CrmApplication) {}

  @Post(":providerKey/:channelKey")
  async ingest(
    @Param("providerKey") providerKey: string,
    @Param("channelKey") channelKey: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CommunicationWebhookInputSchema.parse({
      ...(body as Record<string, unknown>),
      providerKey,
      channelKey,
      tenantId:
        (body as Record<string, unknown>)?.tenantId ??
        req.header("x-tenant-id") ??
        req.header("x-corely-tenant-id"),
    });

    // Return 200 quickly and process async for resilience.
    void this.app.processCommunicationWebhook.execute(input, {
      tenantId: input.tenantId,
      correlationId: req.header("x-correlation-id") ?? undefined,
    });

    return { ok: true };
  }
}
