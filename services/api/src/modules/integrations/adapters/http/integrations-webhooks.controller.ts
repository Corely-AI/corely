import { createHmac } from "node:crypto";
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  Inject,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { EnvService } from "@corely/config";
import {
  CASHLESS_PAYMENT_UPDATE_PORT,
  type CashlessPaymentUpdatePort,
} from "../../../pos/application/ports/cashless-payment-update.port";

@Controller("integrations/webhooks")
export class IntegrationsWebhooksController {
  constructor(
    private readonly env: EnvService,
    @Inject(CASHLESS_PAYMENT_UPDATE_PORT)
    private readonly paymentUpdates: CashlessPaymentUpdatePort
  ) {}

  @Post("sumup")
  @HttpCode(200)
  async handleSumUpWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: Record<string, unknown>,
    @Headers("x-sumup-signature") signature: string | undefined
  ) {
    this.verifySumUpSignature(req.rawBody, signature);

    const providerRef = this.pickString(body, ["id", "checkout_id", "transaction_code"]);
    const workspaceId =
      this.pickString(body, ["workspaceId", "workspace_id", "tenantId", "tenant_id"]) ??
      this.pickHeader(req, "x-workspace-id");
    const status = (this.pickString(body, ["status", "event", "type"]) ?? "").toLowerCase();

    if (!providerRef || !workspaceId) {
      return { ok: false, detail: "Missing providerRef/workspaceId" };
    }

    if (["paid", "successful", "success"].includes(status)) {
      await this.paymentUpdates.markPaid({
        workspaceId,
        providerKind: "sumup",
        providerRef,
        paidAt: new Date(),
        raw: body,
      });
    } else if (["failed", "declined", "error"].includes(status)) {
      await this.paymentUpdates.markFailed({
        workspaceId,
        providerKind: "sumup",
        providerRef,
        reason: status,
        raw: body,
      });
    } else if (["cancelled", "canceled"].includes(status)) {
      await this.paymentUpdates.markCancelled({
        workspaceId,
        providerKind: "sumup",
        providerRef,
        raw: body,
      });
    } else if (["expired", "timeout"].includes(status)) {
      await this.paymentUpdates.markExpired({
        workspaceId,
        providerKind: "sumup",
        providerRef,
        raw: body,
      });
    }

    return { ok: true };
  }

  @Post("microsoft-graph")
  async handleMicrosoftGraphWebhook(
    @Query("validationToken") validationToken: string | undefined,
    @Res() res: Response,
    @Body() body: unknown
  ) {
    if (validationToken) {
      res.status(200).send(validationToken);
      return;
    }

    res.status(200).json({
      ok: true,
      received: body,
    });
  }

  @Post("gmail")
  @HttpCode(200)
  async handleGmailWebhook(@Body() body: unknown) {
    return {
      ok: true,
      received: body,
    };
  }

  private verifySumUpSignature(rawBody: Buffer | undefined, signature: string | undefined): void {
    const secret = this.env.SUMUP_WEBHOOK_SECRET;
    if (!secret) {
      return;
    }
    if (!rawBody || !signature) {
      throw new Error("Missing SumUp webhook signature");
    }

    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (digest !== signature) {
      throw new Error("Invalid SumUp webhook signature");
    }
  }

  private pickString(obj: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = obj[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
    return null;
  }

  private pickHeader(req: Request, header: string): string | null {
    const value = req.header(header);
    return typeof value === "string" && value.length > 0 ? value : null;
  }
}
