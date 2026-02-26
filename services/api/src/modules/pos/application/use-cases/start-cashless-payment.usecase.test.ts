import { describe, expect, it, vi } from "vitest";
import { isOk, type UseCaseContext } from "@corely/kernel";
import type { CashlessGatewayPort } from "../ports/cashless-gateway.port";
import type { PaymentAttemptRepositoryPort } from "../ports/payment-attempt-repository.port";
import { PaymentAttempt } from "../../domain/payment-attempt.entity";
import { StartCashlessPaymentUseCase } from "./start-cashless-payment.usecase";

class InMemoryPaymentAttemptRepository implements PaymentAttemptRepositoryPort {
  public createCalls = 0;
  private readonly byId = new Map<string, PaymentAttempt>();
  private readonly byIdempotency = new Map<string, PaymentAttempt>();
  private readonly byProviderRef = new Map<string, PaymentAttempt>();

  async create(attempt: PaymentAttempt): Promise<void> {
    const snapshot = attempt.toObject();
    const idempotencyKey = this.idempotencyKey(snapshot.workspaceId, snapshot.idempotencyKey);
    if (this.byIdempotency.has(idempotencyKey)) {
      throw new Error("duplicate idempotency key");
    }

    this.createCalls += 1;
    this.byId.set(snapshot.id, attempt);
    this.byIdempotency.set(idempotencyKey, attempt);
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

const ctx: UseCaseContext = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  requestId: "req-1",
  correlationId: "corr-1",
};

describe("StartCashlessPaymentUseCase", () => {
  it("returns the same attempt for repeated idempotency keys", async () => {
    const repository = new InMemoryPaymentAttemptRepository();
    const gateway: CashlessGatewayPort = {
      createSession: vi.fn().mockResolvedValue({
        providerKind: "sumup",
        providerRef: "sumup-session-1",
        status: "pending",
        action: { type: "redirect_url", url: "https://checkout.example/sumup-session-1" },
      }),
      getStatus: vi.fn(),
    };

    const useCase = new StartCashlessPaymentUseCase(gateway, repository);
    const input = {
      registerId: "11111111-1111-1111-1111-111111111111",
      saleId: "22222222-2222-2222-2222-222222222222",
      amountCents: 1500,
      currency: "USD",
      idempotencyKey: "idem-cashless-1",
      providerHint: "sumup" as const,
    };

    const first = await useCase.execute(input, ctx);
    const second = await useCase.execute(
      {
        ...input,
        amountCents: 9999,
      },
      ctx
    );

    expect(isOk(first)).toBe(true);
    expect(isOk(second)).toBe(true);
    if (!isOk(first) || !isOk(second)) {
      throw new Error("Expected successful results");
    }

    expect(first.value.attemptId).toBe(second.value.attemptId);
    expect(first.value.providerRef).toBe("sumup-session-1");
    expect(vi.mocked(gateway.createSession)).toHaveBeenCalledTimes(1);
    expect(repository.createCalls).toBe(1);
  });

  it("persists provider status/action from gateway session response", async () => {
    const repository = new InMemoryPaymentAttemptRepository();
    const gateway: CashlessGatewayPort = {
      createSession: vi.fn().mockResolvedValue({
        providerKind: "sumup",
        providerRef: "sumup-session-2",
        status: "authorized",
        action: { type: "none" as const },
      }),
      getStatus: vi.fn(),
    };

    const useCase = new StartCashlessPaymentUseCase(gateway, repository);
    const result = await useCase.execute(
      {
        registerId: "33333333-3333-3333-3333-333333333333",
        amountCents: 3200,
        currency: "EUR",
        idempotencyKey: "idem-cashless-2",
      },
      ctx
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) {
      throw new Error("Expected successful result");
    }

    expect(result.value.status).toBe("authorized");
    expect(result.value.action).toEqual({ type: "none" });

    const saved = await repository.findById(ctx.workspaceId!, result.value.attemptId);
    expect(saved?.toObject().status).toBe("authorized");
    expect(saved?.toObject().providerRef).toBe("sumup-session-2");
  });
});
