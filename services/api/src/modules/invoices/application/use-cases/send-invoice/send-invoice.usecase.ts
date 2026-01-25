import {
  BaseUseCase,
  ConflictError,
  type IdGeneratorPort,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  buildIdempotencyKey,
  err,
  ok,
} from "@corely/kernel";
import { type SendInvoiceInput, type SendInvoiceOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { type InvoiceEmailDeliveryRepoPort } from "../../ports/invoice-email-delivery-repository.port";
import { type OutboxPort } from "../../ports/outbox.port";
import { createHash } from "crypto";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  deliveryRepo: InvoiceEmailDeliveryRepoPort;
  outbox: OutboxPort;
  idGenerator: IdGeneratorPort;
};

export class SendInvoiceUseCase extends BaseUseCase<SendInvoiceInput, SendInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: SendInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<SendInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }
    if (!ctx.workspaceId) {
      return err(new ValidationError("workspaceId missing from context"));
    }

    // 1. Validate invoice exists + belongs to workspace
    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.workspaceId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    // 2. Confirm invoice is in a sendable state (ISSUED or SENT allowed, DRAFT not allowed)
    if (invoice.status === "DRAFT") {
      return err(new ConflictError("Cannot send a draft invoice. Please finalize it first."));
    }

    if (invoice.status === "CANCELED") {
      return err(new ConflictError("Cannot send a canceled invoice."));
    }

    // 3. Compute idempotency key
    const idempotencyKey =
      input.idempotencyKey ?? this.generateIdempotencyKey(input.invoiceId, input.to);

    // 4. Check for existing delivery (idempotency)
    const existingDelivery = await this.useCaseDeps.deliveryRepo.findByIdempotencyKey(
      ctx.workspaceId,
      idempotencyKey
    );

    if (existingDelivery) {
      // Already queued or sent
      return ok({
        deliveryId: existingDelivery.id,
        status: existingDelivery.status,
      });
    }

    // 5. Create delivery record with status QUEUED
    const deliveryId = this.useCaseDeps.idGenerator.newId();
    await this.useCaseDeps.deliveryRepo.create({
      id: deliveryId,
      tenantId: ctx.workspaceId,
      invoiceId: input.invoiceId,
      to: input.to,
      status: "QUEUED",
      provider: process.env.EMAIL_PROVIDER ?? "resend",
      idempotencyKey,
    });

    // 6. Write outbox event
    const payload = {
      deliveryId,
      invoiceId: input.invoiceId,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      message: input.message,
      attachPdf: input.attachPdf,
      locale: input.locale,
      idempotencyKey,
    };

    await this.useCaseDeps.outbox.enqueue({
      tenantId: ctx.workspaceId,
      eventType: "invoice.email.requested",
      payload,
      correlationId: ctx.correlationId,
    });

    return ok({ deliveryId, status: "QUEUED" });
  }

  private generateIdempotencyKey(invoiceId: string, to: string): string {
    const hash = createHash("sha256").update(to).digest("hex").slice(0, 16);
    return buildIdempotencyKey("invoice-send", invoiceId, hash);
  }
}
