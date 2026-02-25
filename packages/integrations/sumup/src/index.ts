import {
  type CashlessCreateSessionInput,
  type CashlessSession,
  type CashlessSessionStatus,
  IntegrationsHttpClient,
} from "@corely/integrations-core";

interface SumUpCheckout {
  id: string;
  status: string;
  checkout_reference?: string;
  merchant_code?: string;
  amount?: number;
  currency?: string;
  pay_to_email?: string;
  return_url?: string;
  checkout_url?: string;
  qr_code?: string;
}

export interface SumUpClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

export class SumUpCashlessClient {
  private readonly client: IntegrationsHttpClient;

  constructor(options: SumUpClientOptions) {
    this.client = new IntegrationsHttpClient({
      baseUrl: options.baseUrl ?? "https://api.sumup.com",
      provider: "sumup",
      timeoutMs: options.timeoutMs,
      defaultHeaders: {
        Authorization: `Bearer ${options.apiKey}`,
      },
    });
  }

  async createSession(input: CashlessCreateSessionInput): Promise<CashlessSession> {
    const payload = {
      amount: Number((input.amountCents / 100).toFixed(2)),
      currency: input.currency,
      checkout_reference: input.reference,
      description: input.description,
      return_url: input.returnUrl,
    };

    const checkout = await this.client.request<SumUpCheckout>({
      path: "/v0.1/checkouts",
      method: "POST",
      body: payload,
    });

    return this.toSession(checkout);
  }

  async getStatus(providerRef: string): Promise<CashlessSession> {
    const checkout = await this.client.request<SumUpCheckout>({
      path: `/v0.1/checkouts/${providerRef}`,
      method: "GET",
    });

    return this.toSession(checkout);
  }

  async cancelSession(providerRef: string): Promise<CashlessSession> {
    const checkout = await this.client.request<SumUpCheckout>({
      path: `/v0.1/checkouts/${providerRef}`,
      method: "DELETE",
    });

    return this.toSession(checkout);
  }

  private toSession(checkout: SumUpCheckout): CashlessSession {
    return {
      providerRef: checkout.id,
      status: this.mapStatus(checkout.status),
      action: checkout.checkout_url
        ? {
            type: "redirect_url",
            url: checkout.checkout_url,
          }
        : checkout.qr_code
          ? {
              type: "qr_payload",
              payload: checkout.qr_code,
            }
          : {
              type: "none",
            },
      raw: checkout,
    };
  }

  private mapStatus(status: string): CashlessSessionStatus {
    const normalized = status.toUpperCase();

    if (["PENDING", "CREATED", "IN_PROGRESS"].includes(normalized)) {
      return "pending";
    }
    if (["AUTHORIZED", "AUTHORISED"].includes(normalized)) {
      return "authorized";
    }
    if (["PAID", "SUCCESSFUL", "SUCCESS"].includes(normalized)) {
      return "paid";
    }
    if (["FAILED", "DECLINED", "ERROR"].includes(normalized)) {
      return "failed";
    }
    if (["CANCELED", "CANCELLED"].includes(normalized)) {
      return "cancelled";
    }
    if (["EXPIRED", "TIMEOUT"].includes(normalized)) {
      return "expired";
    }
    return "pending";
  }
}
