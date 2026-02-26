import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Prisma } from "@prisma/client";
import type { CashlessAction, CashlessProviderKind } from "@corely/contracts";
import { PaymentAttempt } from "../../domain/payment-attempt.entity";
import type { PaymentAttemptRepositoryPort } from "../../application/ports/payment-attempt-repository.port";

const toProviderKind = (value: CashlessProviderKind): "SUMUP" | "ADYEN" =>
  value === "sumup" ? "SUMUP" : "ADYEN";

@Injectable()
export class PrismaPaymentAttemptRepositoryAdapter implements PaymentAttemptRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(attempt: PaymentAttempt): Promise<void> {
    const data = attempt.toObject();

    await this.prisma.paymentAttempt.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        saleId: data.saleId,
        registerId: data.registerId,
        amountCents: data.amountCents,
        currency: data.currency,
        status: this.toPrismaStatus(data.status),
        providerKind: toProviderKind(data.providerKind),
        providerRef: data.providerRef,
        actionJson: this.toNullableJsonInput(data.action),
        idempotencyKey: data.idempotencyKey,
        failureReason: data.failureReason,
        paidAt: data.paidAt,
        expiresAt: data.expiresAt,
        rawStatusJson: this.toNullableJsonInput(data.rawStatus),
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
    });
  }

  async update(attempt: PaymentAttempt): Promise<void> {
    const data = attempt.toObject();

    await this.prisma.paymentAttempt.update({
      where: {
        id: data.id,
      },
      data: {
        status: this.toPrismaStatus(data.status),
        actionJson: this.toNullableJsonInput(data.action),
        failureReason: data.failureReason,
        paidAt: data.paidAt,
        expiresAt: data.expiresAt,
        rawStatusJson: this.toNullableJsonInput(data.rawStatus),
        updatedAt: data.updatedAt,
      },
    });
  }

  async findById(workspaceId: string, attemptId: string): Promise<PaymentAttempt | null> {
    const row = await this.prisma.paymentAttempt.findFirst({
      where: {
        workspaceId,
        id: attemptId,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByIdempotencyKey(
    workspaceId: string,
    idempotencyKey: string
  ): Promise<PaymentAttempt | null> {
    const row = await this.prisma.paymentAttempt.findFirst({
      where: {
        workspaceId,
        idempotencyKey,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  async findByProviderRef(
    workspaceId: string,
    providerKind: CashlessProviderKind,
    providerRef: string
  ): Promise<PaymentAttempt | null> {
    const row = await this.prisma.paymentAttempt.findFirst({
      where: {
        workspaceId,
        providerKind: toProviderKind(providerKind),
        providerRef,
      },
    });

    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: {
    id: string;
    tenantId: string;
    workspaceId: string;
    saleId: string | null;
    registerId: string;
    amountCents: number;
    currency: string;
    status: string;
    providerKind: string;
    providerRef: string;
    actionJson: unknown;
    idempotencyKey: string;
    failureReason: string | null;
    paidAt: Date | null;
    expiresAt: Date | null;
    rawStatusJson: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): PaymentAttempt {
    return new PaymentAttempt({
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      saleId: row.saleId,
      registerId: row.registerId,
      amountCents: row.amountCents,
      currency: row.currency,
      status: this.fromPrismaStatus(row.status),
      providerKind: row.providerKind === "SUMUP" ? "sumup" : "adyen",
      providerRef: row.providerRef,
      action: this.toCashlessAction(row.actionJson),
      idempotencyKey: row.idempotencyKey,
      failureReason: row.failureReason,
      paidAt: row.paidAt,
      expiresAt: row.expiresAt,
      rawStatus: row.rawStatusJson,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private toPrismaStatus(
    status: string
  ): "PENDING" | "AUTHORIZED" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED" {
    return status.toUpperCase() as
      | "PENDING"
      | "AUTHORIZED"
      | "PAID"
      | "FAILED"
      | "CANCELLED"
      | "EXPIRED";
  }

  private fromPrismaStatus(
    status: string
  ): "pending" | "authorized" | "paid" | "failed" | "cancelled" | "expired" {
    return status.toLowerCase() as
      | "pending"
      | "authorized"
      | "paid"
      | "failed"
      | "cancelled"
      | "expired";
  }

  private toCashlessAction(value: unknown): CashlessAction {
    if (typeof value !== "object" || value === null) {
      return { type: "none" };
    }
    const maybeAction = value as {
      type?: unknown;
      url?: unknown;
      payload?: unknown;
      instruction?: unknown;
    };
    if (maybeAction.type === "redirect_url" && typeof maybeAction.url === "string") {
      return { type: "redirect_url", url: maybeAction.url };
    }
    if (maybeAction.type === "qr_payload" && typeof maybeAction.payload === "string") {
      return { type: "qr_payload", payload: maybeAction.payload };
    }
    if (maybeAction.type === "terminal_action" && typeof maybeAction.instruction === "string") {
      return { type: "terminal_action", instruction: maybeAction.instruction };
    }
    return { type: "none" };
  }

  private toNullableJsonInput(
    value: unknown
  ): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    if (value === null || value === undefined) {
      return Prisma.JsonNull;
    }

    return value as Prisma.InputJsonValue;
  }
}
