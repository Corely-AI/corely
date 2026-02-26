import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { EnvService } from "@corely/config";
import type { PaymentAttemptRepositoryPort } from "../../../pos/application/ports/payment-attempt-repository.port";
import { PaymentAttempt } from "../../../pos/domain/payment-attempt.entity";
import { CashlessPaymentUpdaterService } from "../../../pos/application/services/cashless-payment-updater.service";
import { IntegrationsWebhooksController } from "./integrations-webhooks.controller";

class InMemoryPaymentAttemptRepository implements PaymentAttemptRepositoryPort {
  private readonly byId = new Map<string, PaymentAttempt>();
  private readonly byIdempotency = new Map<string, PaymentAttempt>();
  private readonly byProviderRef = new Map<string, PaymentAttempt>();

  async create(attempt: PaymentAttempt): Promise<void> {
    const snapshot = attempt.toObject();
    this.byId.set(snapshot.id, attempt);
    this.byIdempotency.set(
      this.idempotencyKey(snapshot.workspaceId, snapshot.idempotencyKey),
      attempt
    );
    this.byProviderRef.set(
      this.providerRefKey(snapshot.workspaceId, snapshot.providerKind, snapshot.providerRef),
      attempt
    );
  }

  async update(attempt: PaymentAttempt): Promise<void> {
    const snapshot = attempt.toObject();
    this.byId.set(snapshot.id, attempt);
    this.byIdempotency.set(
      this.idempotencyKey(snapshot.workspaceId, snapshot.idempotencyKey),
      attempt
    );
    this.byProviderRef.set(
      this.providerRefKey(snapshot.workspaceId, snapshot.providerKind, snapshot.providerRef),
      attempt
    );
  }

  async findById(workspaceId: string, attemptId: string): Promise<PaymentAttempt | null> {
    const attempt = this.byId.get(attemptId);
    if (!attempt || attempt.toObject().workspaceId !== workspaceId) {
      return null;
    }
    return attempt;
  }

  async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string
  ): Promise<PaymentAttempt | null> {
    return this.byIdempotency.get(this.idempotencyKey(workspaceId, idempotencyKey)) ?? null;
  }

  async findByProviderRef(
    workspaceId: string,
    providerKind: "sumup" | "adyen",
    providerRef: string
  ): Promise<PaymentAttempt | null> {
    return (
      this.byProviderRef.get(this.providerRefKey(workspaceId, providerKind, providerRef)) ?? null
    );
  }

  private idempotencyKey(workspaceId: string, idempotencyKey: string): string {
    return `${workspaceId}:${idempotencyKey}`;
  }

  private providerRefKey(
    workspaceId: string,
    providerKind: "sumup" | "adyen",
    providerRef: string
  ): string {
    return `${workspaceId}:${providerKind}:${providerRef}`;
  }
}

describe("IntegrationsWebhooksController (integration)", () => {
  it("updates payment attempt state via the payments update port on SumUp webhook", async () => {
    const attempts = new InMemoryPaymentAttemptRepository();
    const paymentUpdater = new CashlessPaymentUpdaterService(attempts);
    const env = { SUMUP_WEBHOOK_SECRET: undefined } as unknown as EnvService;
    const controller = new IntegrationsWebhooksController(env, paymentUpdater);

    await attempts.create(
      PaymentAttempt.create({
        id: "attempt-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        registerId: "11111111-1111-1111-1111-111111111111",
        saleId: "22222222-2222-2222-2222-222222222222",
        amountCents: 2400,
        currency: "EUR",
        status: "pending",
        providerKind: "sumup",
        providerRef: "sumup-ref-1",
        action: { type: "none" },
        idempotencyKey: "idem-webhook-1",
      })
    );

    const req = {
      header: () => null,
    } as unknown as Request & { rawBody?: Buffer };

    const result = await controller.handleSumUpWebhook(
      req,
      {
        id: "sumup-ref-1",
        workspaceId: "workspace-1",
        status: "paid",
      },
      undefined
    );

    expect(result).toEqual({ ok: true });

    const updated = await attempts.findByProviderRef("workspace-1", "sumup", "sumup-ref-1");
    expect(updated).not.toBeNull();
    expect(updated?.toObject().status).toBe("paid");
    expect(updated?.toObject().rawStatus).toEqual(
      expect.objectContaining({
        status: "paid",
      })
    );
  });
});
