import React from "react";
import { Inject, Injectable } from "@nestjs/common";
import {
  PrismaDocumentRepoAdapter,
  PrismaFileRepoAdapter,
  PrismaInvoiceEmailDeliveryAdapter,
} from "@corely/data";
import { PrismaInvoiceEmailRepository } from "./infrastructure/prisma-invoice-email-repository.adapter";
import { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";
import { renderEmail } from "@corely/email-templates";
import { InvoiceEmail, buildInvoiceEmailSubject } from "@corely/email-templates/invoices";
import { mapToInvoiceEmailProps } from "./invoice-email-props.mapper";
import { EMAIL_SENDER_PORT, OBJECT_STORAGE_PORT } from "@corely/kernel";
import type { EmailAttachment, EmailSenderPort, ObjectStoragePort } from "@corely/kernel";

const PDF_ATTACH_WAIT_TIMEOUT_MS = 90_000;
const PDF_ATTACH_POLL_MS = 1_500;
const PDF_SIGNED_URL_TTL_SECONDS = 3600;

export type InvoiceEmailRequestedPayload = {
  deliveryId: string;
  invoiceId: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  message?: string;
  attachPdf?: boolean;
  locale?: string;
  idempotencyKey: string;
};

@Injectable()
export class InvoiceEmailRequestedHandler implements EventHandler {
  readonly eventType = "invoice.email.requested";

  constructor(
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort,
    private readonly repo: PrismaInvoiceEmailRepository,
    private readonly deliveryRepo: PrismaInvoiceEmailDeliveryAdapter,
    private readonly documentRepo: PrismaDocumentRepoAdapter,
    private readonly fileRepo: PrismaFileRepoAdapter,
    @Inject(OBJECT_STORAGE_PORT) private readonly objectStorage: ObjectStoragePort
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as InvoiceEmailRequestedPayload;

    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid payload for invoice.email.requested");
    }

    // 1. Load delivery record
    const delivery = await this.deliveryRepo.findById(event.tenantId, payload.deliveryId);

    if (!delivery) {
      throw new Error(`Delivery record not found: ${payload.deliveryId}`);
    }

    if (delivery.status === "SENT") {
      return;
    }

    // 2. Load invoice context
    const invoice = await this.repo.findInvoiceWithLines(event.tenantId, payload.invoiceId);

    if (!invoice) {
      throw new Error(`Invoice not found: ${payload.invoiceId}`);
    }

    // 3. Prepare email template props
    const companyName = this.resolveCompanyName(invoice);
    const workspaceSlug = await this.repo.findWorkspaceSlug(event.tenantId);
    const portalUrl = this.buildPortalUrl(workspaceSlug);

    const emailProps = mapToInvoiceEmailProps({
      invoice,
      companyName,
      customMessage: payload.message,
      locale: payload.locale,
      viewInvoiceUrl: portalUrl,
    });

    const subject = buildInvoiceEmailSubject(emailProps);

    // 4. Render email template
    const { html, text } = await renderEmail(<InvoiceEmail {...emailProps} />);

    try {
      let attachments: EmailAttachment[] | undefined;
      if (payload.attachPdf) {
        attachments = [
          await this.resolveInvoicePdfAttachment({
            tenantId: event.tenantId,
            invoiceId: payload.invoiceId,
            invoiceNumber: invoice.number ?? undefined,
          }),
        ];
      }

      // 5. Send email via provider
      const emailRequest: any = {
        tenantId: event.tenantId,
        to: [payload.to],
        subject,
        html,
        text,
        attachments,
        idempotencyKey: payload.idempotencyKey,
      };

      if (event.correlationId) {
        emailRequest.headers = { "X-Correlation-ID": event.correlationId };
      }
      if (payload.cc) {
        emailRequest.cc = payload.cc;
      }
      if (payload.bcc) {
        emailRequest.bcc = payload.bcc;
      }

      const result = await this.emailSender.sendEmail(emailRequest);

      // 6. Update delivery record to SENT
      await this.deliveryRepo.updateStatus(event.tenantId, payload.deliveryId, "SENT", {
        providerMessageId: result.providerMessageId,
      });
    } catch (error) {
      // Update delivery record to FAILED
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.deliveryRepo.updateStatus(event.tenantId, payload.deliveryId, "FAILED", {
        lastError: errorMessage,
      });

      throw error; // Re-throw to mark outbox event as failed
    }
  }

  private async resolveInvoicePdfAttachment(params: {
    tenantId: string;
    invoiceId: string;
    invoiceNumber?: string;
  }): Promise<EmailAttachment> {
    const deadline = Date.now() + PDF_ATTACH_WAIT_TIMEOUT_MS;

    while (Date.now() <= deadline) {
      const document = await this.documentRepo.findByTypeAndEntityLink(
        params.tenantId,
        "INVOICE_PDF",
        "INVOICE",
        params.invoiceId
      );

      if (document?.status === "READY") {
        const generatedFile =
          (await this.fileRepo.findByDocumentAndKind(params.tenantId, document.id, "GENERATED")) ??
          (await this.fileRepo.findByDocument(params.tenantId, document.id)).find(
            (file) => file.kind === "GENERATED"
          ) ??
          null;

        if (generatedFile) {
          const head = await this.objectStorage.headObject({
            tenantId: params.tenantId,
            objectKey: generatedFile.objectKey,
          });

          if (head.exists) {
            const signed = await this.objectStorage.createSignedDownloadUrl({
              tenantId: params.tenantId,
              objectKey: generatedFile.objectKey,
              expiresInSeconds: PDF_SIGNED_URL_TTL_SECONDS,
            });
            return {
              filename: this.buildPdfFilename(params.invoiceNumber, params.invoiceId),
              path: signed.url,
              mimeType: "application/pdf",
            };
          }
        }
      }

      await this.sleep(PDF_ATTACH_POLL_MS);
    }

    throw new Error(`Invoice PDF is not ready for attachment: ${params.invoiceId}`);
  }

  private buildPdfFilename(invoiceNumber: string | undefined, invoiceId: string): string {
    const base = (invoiceNumber ?? invoiceId).replace(/[^a-zA-Z0-9._-]/g, "-");
    return `Invoice-${base}.pdf`;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private resolveCompanyName(invoice: {
    issuerSnapshot?: unknown;
    legalEntity?: { legalName?: string | null } | null;
  }): string {
    const snapshotName = this.extractIssuerName(invoice.issuerSnapshot);
    if (snapshotName) {
      return snapshotName;
    }

    const legalName = invoice.legalEntity?.legalName;
    if (typeof legalName === "string" && legalName.trim().length > 0) {
      return legalName.trim();
    }

    return "Corely.one";
  }

  private extractIssuerName(issuerSnapshot: unknown): string | undefined {
    if (!issuerSnapshot || typeof issuerSnapshot !== "object") {
      return undefined;
    }

    const maybeName = (issuerSnapshot as { name?: unknown }).name;
    if (typeof maybeName !== "string") {
      return undefined;
    }

    const trimmed = maybeName.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private buildPortalUrl(workspaceSlug: string | null): string | undefined {
    if (!workspaceSlug) {
      return undefined;
    }

    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
      const portalDomain = process.env.PORTAL_DOMAIN || "portal.corely.one";
      return `https://${workspaceSlug}.${portalDomain}`;
    }

    const portalBase = process.env.PORTAL_URL || "http://localhost:8083";
    const normalizedBase = portalBase.replace(/\/+$/, "");
    return `${normalizedBase}/w/${workspaceSlug}`;
  }
}
