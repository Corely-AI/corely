import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CommunicationWebhookInputSchema,
  CreateCommunicationDraftInputSchema,
  LogCommunicationInputSchema,
  SendCommunicationInputSchema,
} from "@corely/contracts";
import { EnvService } from "@corely/config";
import { isErr } from "@corely/kernel";
import { PrismaService } from "@corely/data";
import { Resend } from "resend";
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
  private readonly resendWebhookSecret: string;
  private readonly resendVerifier: Resend;

  constructor(
    private readonly app: CrmApplication,
    private readonly prisma: PrismaService,
    private readonly env: EnvService
  ) {
    this.resendWebhookSecret = this.env.RESEND_WEBHOOK_SECRET ?? "";
    this.resendVerifier = new Resend(this.env.RESEND_API_KEY ?? "resend-webhook-verifier");
  }

  @Post("resend/inbound")
  async ingestResendInbound(
    @Body() body: unknown,
    @Req() req: RawBodyRequest<Request>,
    @Query("tenantId") tenantIdQuery: string | undefined
  ) {
    const payload = this.verifyResendPayload(req, body);
    const providedTenantId =
      tenantIdQuery ??
      this.pickString(payload, ["tenantId"]) ??
      req.header("x-tenant-id") ??
      req.header("x-corely-tenant-id") ??
      undefined;
    const tenantId = providedTenantId ?? (await this.resolveTenantId(payload));

    if (!tenantId) {
      throw new BadRequestException(
        "Missing tenantId for resend inbound webhook. Provide tenantId or ensure the inbound email can be linked to an existing resend activity/from address."
      );
    }

    const result = await this.app.processResendInboundEmail.execute(
      {
        tenantId,
        payload,
      },
      {
        tenantId,
        correlationId: req.header("x-correlation-id") ?? undefined,
      }
    );

    if (isErr(result)) {
      throw new BadRequestException(result.error.message);
    }

    return { ok: true };
  }

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

  private async resolveTenantId(payload: Record<string, unknown>): Promise<string | null> {
    const fromActivity = await this.resolveTenantIdFromActivity(payload);
    if (fromActivity) {
      return fromActivity;
    }

    return this.resolveTenantIdFromResendConnection(payload);
  }

  private async resolveTenantIdFromActivity(
    payload: Record<string, unknown>
  ): Promise<string | null> {
    const headers = this.normalizeHeaders(payload);
    const inReplyToIds = this.parseMessageIdList(headers.get("in-reply-to"));
    const referencesIds = this.parseMessageIdList(headers.get("references"));
    const threadId =
      this.pickString(payload, ["data", "thread_id"]) ??
      this.pickString(payload, ["data", "threadId"]) ??
      this.pickString(payload, ["thread_id"]) ??
      this.pickString(payload, ["threadId"]);

    const candidateIds = Array.from(
      new Set(
        [...inReplyToIds, ...referencesIds, threadId]
          .map((value) => this.stripMessageId(value))
          .filter((value): value is string => typeof value === "string" && value.length > 0)
      )
    );

    if (candidateIds.length === 0) {
      return null;
    }

    const linked = await this.prisma.activity.findFirst({
      where: {
        type: "COMMUNICATION",
        providerKey: "resend",
        OR: [
          { externalMessageId: { in: candidateIds } },
          { externalThreadId: { in: candidateIds } },
          { threadKey: { in: candidateIds } },
        ],
      },
      select: { tenantId: true },
      orderBy: { createdAt: "desc" },
    });

    return linked?.tenantId ?? null;
  }

  private async resolveTenantIdFromResendConnection(
    payload: Record<string, unknown>
  ): Promise<string | null> {
    const toEmails = [
      ...this.extractEmails(this.pickUnknown(payload, ["data", "to"])),
      ...this.extractEmails(this.pickUnknown(payload, ["to"])),
      ...this.extractEmails(this.pickUnknown(payload, ["data", "envelope", "to"])),
      ...this.extractEmails(this.pickUnknown(payload, ["envelope", "to"])),
    ].map((email) => email.toLowerCase());

    const uniqueRecipients = Array.from(new Set(toEmails));
    if (uniqueRecipients.length === 0) {
      return null;
    }

    const resendConnections = await this.prisma.integrationConnection.findMany({
      where: {
        kind: "RESEND",
        status: "ACTIVE",
      },
      select: {
        tenantId: true,
        configJson: true,
      },
    });

    const tenantMatches = new Set<string>();
    for (const connection of resendConnections) {
      const config =
        connection.configJson && typeof connection.configJson === "object"
          ? (connection.configJson as Record<string, unknown>)
          : {};
      const connectionEmails = [
        this.readConfigString(config, "fromAddress"),
        this.readConfigString(config, "from"),
        this.readConfigString(config, "replyTo"),
        this.readConfigString(config, "reply_to"),
      ]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());

      if (connectionEmails.some((value) => uniqueRecipients.includes(value))) {
        tenantMatches.add(connection.tenantId);
      }
    }

    if (tenantMatches.size === 1) {
      return Array.from(tenantMatches)[0];
    }

    return null;
  }

  private readConfigString(config: Record<string, unknown>, key: string): string | null {
    const value = config[key];
    if (typeof value !== "string") {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeHeaders(payload: Record<string, unknown>): Map<string, string> {
    const headers = new Map<string, string>();
    const rawHeaders = this.pickUnknown(payload, ["data", "headers"]);

    if (Array.isArray(rawHeaders)) {
      for (const header of rawHeaders) {
        if (!header || typeof header !== "object") {
          continue;
        }
        const name = this.pickString(header as Record<string, unknown>, ["name"]);
        const value = this.pickString(header as Record<string, unknown>, ["value"]);
        if (name && value) {
          headers.set(name.toLowerCase(), value);
        }
      }
      return headers;
    }

    if (rawHeaders && typeof rawHeaders === "object") {
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (typeof value === "string" && value.length > 0) {
          headers.set(key.toLowerCase(), value);
        }
      }
    }

    return headers;
  }

  private extractEmails(value: unknown): string[] {
    if (typeof value === "string") {
      return this.extractEmailsFromText(value);
    }

    if (Array.isArray(value)) {
      return value.flatMap((item) => this.extractEmails(item));
    }

    if (value && typeof value === "object") {
      const asRecord = value as Record<string, unknown>;
      const direct = asRecord.email;
      if (typeof direct === "string") {
        return this.extractEmailsFromText(direct);
      }

      const nested = asRecord.address;
      if (typeof nested === "string") {
        return this.extractEmailsFromText(nested);
      }

      return Object.values(asRecord).flatMap((item) => this.extractEmails(item));
    }

    return [];
  }

  private extractEmailsFromText(text: string): string[] {
    const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
    return matches.map((match) => match.trim());
  }

  private stripMessageId(value: string | null): string | null {
    if (!value) {
      return null;
    }

    const match = value.match(/<([^>]+)>/);
    const normalized = (match ? match[1] : value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private parseMessageIdList(value: string | undefined): string[] {
    if (!value) {
      return [];
    }
    const bracketMatches = [...value.matchAll(/<([^>]+)>/g)].map((match) => match[1]?.trim() ?? "");
    const candidates = bracketMatches.length > 0 ? bracketMatches : value.split(/\s+/);
    return Array.from(
      new Set(
        candidates
          .map((candidate) => this.stripMessageId(candidate))
          .filter((candidate): candidate is string => Boolean(candidate))
      )
    );
  }

  private pickUnknown(obj: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = obj;
    for (const key of path) {
      if (!current || typeof current !== "object") {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return current;
  }

  private pickString(obj: Record<string, unknown>, path: string[]): string | null {
    const value = this.pickUnknown(obj, path);
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private verifyResendPayload(
    req: RawBodyRequest<Request>,
    body: unknown
  ): Record<string, unknown> {
    const fallbackPayload =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};

    if (!this.resendWebhookSecret) {
      return fallbackPayload;
    }

    const svixId = req.header("svix-id");
    const svixTimestamp = req.header("svix-timestamp");
    const svixSignature = req.header("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException("Missing Svix signature headers");
    }

    const rawBody =
      req.rawBody?.toString("utf-8") ??
      (typeof body === "string" ? body : JSON.stringify(body ?? {}));

    try {
      return this.resendVerifier.webhooks.verify({
        body: rawBody,
        headers: {
          "svix-id": svixId,
          "svix-timestamp": svixTimestamp,
          "svix-signature": svixSignature,
        },
        secret: this.resendWebhookSecret,
      } as any) as Record<string, unknown>;
    } catch {
      throw new UnauthorizedException("Invalid Resend webhook signature");
    }
  }
}
