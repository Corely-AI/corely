import Stripe from "stripe";
import {
  buildExternalServiceError,
  type CashlessAction,
  type CashlessCreateSessionInput,
  type CashlessSession,
  type CashlessSessionStatus,
} from "@corely/integrations-core";

export type StripeTerminalMode = "sdk" | "server_driven";
export type StripeTerminalCaptureMode = "automatic" | "manual";

export interface StripeTerminalClientOptions {
  secretKey: string;
  terminalMode?: StripeTerminalMode;
  terminalLocationId?: string;
  defaultReaderId?: string;
  captureMode?: StripeTerminalCaptureMode;
  stripeAccountId?: string;
  timeoutMs?: number;
  maxNetworkRetries?: number;
}

export interface StripeTerminalConnectionToken {
  secret: string;
  locationId: string | null;
}

export class StripeTerminalCashlessClient {
  private readonly stripe: Stripe;
  private readonly terminalMode: StripeTerminalMode;
  private readonly terminalLocationId: string | null;
  private readonly defaultReaderId: string | null;
  private readonly captureMode: StripeTerminalCaptureMode;
  private readonly stripeAccountId: string | null;

  constructor(options: StripeTerminalClientOptions) {
    this.terminalMode = options.terminalMode ?? "sdk";
    this.terminalLocationId = options.terminalLocationId ?? null;
    this.defaultReaderId = options.defaultReaderId ?? null;
    this.captureMode = options.captureMode ?? "automatic";
    this.stripeAccountId = options.stripeAccountId ?? null;

    const stripeConfig: Stripe.StripeConfig = {
      ...(options.timeoutMs !== undefined ? { timeout: options.timeoutMs } : {}),
      ...(options.maxNetworkRetries !== undefined
        ? { maxNetworkRetries: options.maxNetworkRetries }
        : {}),
    };
    this.stripe = new Stripe(options.secretKey, stripeConfig);
  }

  async createSession(input: CashlessCreateSessionInput): Promise<CashlessSession> {
    const paymentIntent = await this.withStripeError("create payment intent", () =>
      this.stripe.paymentIntents.create(this.toCreateParams(input), this.requestOptions())
    );

    const action = await this.buildCreateAction(paymentIntent);
    return this.toSession(paymentIntent, action);
  }

  async getStatus(providerRef: string): Promise<CashlessSession> {
    const paymentIntent = await this.withStripeError("retrieve payment intent", () =>
      this.stripe.paymentIntents.retrieve(providerRef, {}, this.requestOptions())
    );
    return this.toSession(paymentIntent);
  }

  async cancelSession(providerRef: string): Promise<CashlessSession> {
    const paymentIntent = await this.withStripeError("cancel payment intent", () =>
      this.stripe.paymentIntents.cancel(providerRef, {}, this.requestOptions())
    );
    return this.toSession(paymentIntent);
  }

  async createConnectionToken(input?: {
    locationId?: string;
  }): Promise<StripeTerminalConnectionToken> {
    const locationId = input?.locationId ?? this.terminalLocationId;
    const params: Stripe.Terminal.ConnectionTokenCreateParams = {};
    if (locationId) {
      params.location = locationId;
    }

    const token = await this.withStripeError("create terminal connection token", () =>
      this.stripe.terminal.connectionTokens.create(params, this.requestOptions())
    );

    return {
      secret: token.secret,
      locationId: locationId ?? null,
    };
  }

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      throw this.toExternalError("verify webhook signature", error);
    }
  }

  private toCreateParams(input: CashlessCreateSessionInput): Stripe.PaymentIntentCreateParams {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: input.amountCents,
      currency: input.currency.toLowerCase(),
      payment_method_types: ["card_present"],
      capture_method: this.captureMode === "manual" ? "manual" : "automatic",
    };

    if (input.description) {
      params.description = input.description;
    }

    const metadata: Record<string, string> = {};
    if (input.reference.length > 0) {
      metadata.reference = input.reference;
    }
    if (Object.keys(metadata).length > 0) {
      params.metadata = metadata;
    }

    return params;
  }

  private async buildCreateAction(paymentIntent: Stripe.PaymentIntent): Promise<CashlessAction> {
    if (this.terminalMode === "server_driven") {
      if (!this.defaultReaderId) {
        throw buildExternalServiceError(
          "Stripe Terminal defaultReaderId is required in server_driven mode",
          {
            provider: "stripe_terminal",
            retryable: false,
          }
        );
      }
      const readerId = this.defaultReaderId;

      await this.withStripeError("start reader payment action", () =>
        this.stripe.terminal.readers.processPaymentIntent(
          readerId,
          {
            payment_intent: paymentIntent.id,
          },
          this.requestOptions()
        )
      );

      return {
        type: "terminal_action",
        instruction: "process_payment_intent",
        provider: "stripe_terminal",
        readerId,
        paymentIntentId: paymentIntent.id,
      };
    }

    if (!paymentIntent.client_secret) {
      throw buildExternalServiceError("Stripe Terminal payment intent is missing client secret", {
        provider: "stripe_terminal",
        retryable: false,
      });
    }

    return {
      type: "stripe_terminal_sdk",
      paymentIntentClientSecret: paymentIntent.client_secret,
      terminalLocationId: this.terminalLocationId,
      paymentIntentId: paymentIntent.id,
    };
  }

  private toSession(paymentIntent: Stripe.PaymentIntent, action?: CashlessAction): CashlessSession {
    return {
      providerRef: paymentIntent.id,
      status: this.mapStatus(paymentIntent.status),
      action: action ?? { type: "none" },
      raw: paymentIntent,
    };
  }

  private mapStatus(status: Stripe.PaymentIntent.Status): CashlessSessionStatus {
    switch (status) {
      case "succeeded":
        return "paid";
      case "requires_capture":
        return "authorized";
      case "canceled":
        return "cancelled";
      case "requires_payment_method":
        return "failed";
      case "processing":
      case "requires_action":
      case "requires_confirmation":
        return "pending";
      default:
        return "pending";
    }
  }

  private requestOptions(): Stripe.RequestOptions | undefined {
    if (!this.stripeAccountId) {
      return undefined;
    }

    return {
      stripeAccount: this.stripeAccountId,
    };
  }

  private async withStripeError<T>(action: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw this.toExternalError(action, error);
    }
  }

  private toExternalError(action: string, error: unknown): Error {
    if (error instanceof Error) {
      const status = this.readStatusCode(error);
      return buildExternalServiceError(
        `Stripe Terminal failed to ${action}: ${error.message}`,
        {
          provider: "stripe_terminal",
          ...(status !== undefined ? { status } : {}),
          retryable: status ? status >= 500 || status === 429 : true,
        },
        error
      );
    }

    return buildExternalServiceError(`Stripe Terminal failed to ${action}`, {
      provider: "stripe_terminal",
      retryable: true,
    });
  }

  private readStatusCode(error: Error): number | undefined {
    const candidate = error as { statusCode?: unknown };
    return typeof candidate.statusCode === "number" ? candidate.statusCode : undefined;
  }
}
