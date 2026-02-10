import React from "react";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { EventHandler, OutboxEvent } from "../outbox/event-handler.interface";
import { renderEmail } from "@corely/email-templates";
import { LeadConfirmationEmail, buildLeadConfirmationEmailSubject } from "@corely/email-templates";
import { EMAIL_SENDER_PORT, type EmailSenderPort } from "@corely/kernel";

@Injectable()
export class FormsEventHandler implements EventHandler {
  public readonly eventType = "Forms.PublicFormSubmitted";
  private readonly logger = new Logger(FormsEventHandler.name);

  constructor(
    @Inject(EnvService) private readonly env: EnvService,
    @Inject(EMAIL_SENDER_PORT) private readonly emailSender: EmailSenderPort
  ) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as any;
    const { postSubmitAction, submissionId, formId, payload: submissionPayload } = payload;

    if (postSubmitAction === "CREATE_TUTORING_LEAD") {
      this.logger.log(`Processing lead intake for submission ${submissionId}`);

      const baseUrl = this.env.WORKER_API_BASE_URL;
      if (!baseUrl) {
        this.logger.warn("WORKER_API_BASE_URL not set; skipping lead intake.");
        return;
      }

      const url = `${baseUrl.replace(/\/$/, "")}/internal/party/leads/from-form`;
      const headers: Record<string, string> = {
        "content-type": "application/json",
        "x-tenant-id": event.tenantId,
      };

      const token = this.env.WORKER_API_SERVICE_TOKEN;
      if (token) {
        headers["x-service-token"] = token;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          submissionId,
          formId,
          payload: submissionPayload,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Failed to create tutoring lead: ${response.status} ${response.statusText} ${body}`
        );
      }

      const leadData = (await response.json()) as {
        guardianId: string;
        guardianName: string;
        studentName?: string;
      };

      this.logger.log(
        `Lead intake successful for submission ${submissionId}. Sending confirmation email.`
      );

      // Send confirmation email
      const parentEmail = submissionPayload.parentEmail || submissionPayload.email;
      if (!parentEmail) {
        this.logger.warn(
          `No email found in payload for submission ${submissionId}. Skipping email.`
        );
        return;
      }

      const tenantName = "Kerniflow Tutoring"; // TODO: Get from tenant info if available
      const emailProps = {
        parentName: leadData.guardianName,
        studentName: leadData.studentName,
        tenantName,
      };

      const subject = buildLeadConfirmationEmailSubject(tenantName);
      const { html, text } = await renderEmail(<LeadConfirmationEmail {...emailProps} />);

      await this.emailSender.sendEmail({
        tenantId: event.tenantId,
        to: [parentEmail],
        subject,
        html,
        text,
        idempotencyKey: `lead-confirm:${submissionId}`,
      });

      this.logger.log(`Confirmation email sent for submission ${submissionId}`);
    }
  }
}
