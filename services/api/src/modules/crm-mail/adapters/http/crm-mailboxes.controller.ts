import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateCrmMailboxInputSchema,
  SendCrmMailboxMessageInputSchema,
  SyncCrmMailboxInputSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../../identity";
import { buildUseCaseContext, mapResultToHttp } from "../../../../shared/http/usecase-mappers";
import { CrmMailApplication } from "../../application/crm-mail.application";

@Controller("crm/mailboxes")
@UseGuards(AuthGuard)
export class CrmMailboxesController {
  constructor(private readonly app: CrmMailApplication) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateCrmMailboxInputSchema.parse(body);
    const result = await this.app.createMailbox.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post(":id/send")
  async send(@Param("id") mailboxId: string, @Body() body: unknown, @Req() req: Request) {
    const input = SendCrmMailboxMessageInputSchema.parse({
      ...(body as Record<string, unknown>),
      mailboxId,
    });
    const result = await this.app.sendMessage.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }

  @Post(":id/sync")
  async sync(@Param("id") mailboxId: string, @Body() body: unknown, @Req() req: Request) {
    const input = SyncCrmMailboxInputSchema.parse({
      ...(body as Record<string, unknown>),
      mailboxId,
    });
    const result = await this.app.syncMailbox.execute(input, buildUseCaseContext(req));
    return mapResultToHttp(result);
  }
}
