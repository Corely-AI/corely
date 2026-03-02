import { Injectable } from "@nestjs/common";
import { ValidationError } from "@corely/kernel";
import { GoogleGmailClient } from "@corely/integrations-google-gmail";
import { MicrosoftGraphMailClient } from "@corely/integrations-microsoft-graph-mail";
import { ResendMailClient } from "@corely/integrations-resend";
import { IntegrationConnectionResolverService } from "../../application/services/integration-connection-resolver.service";
import { IntegrationProviderRegistryService } from "../../application/services/integration-provider-registry.service";

@Injectable()
export class IntegrationsEmailProviderService {
  constructor(
    private readonly resolver: IntegrationConnectionResolverService,
    private readonly providers: IntegrationProviderRegistryService
  ) {}

  async send(input: {
    tenantId: string;
    connectionId: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    replyTo?: string;
  }): Promise<{ providerMessageId?: string }> {
    const resolved = await this.resolver.resolveById(input.tenantId, input.connectionId);
    const kind = resolved.connection.toObject().kind;

    if (kind === "resend") {
      const client = this.providers.getMailClient(resolved.connection) as ResendMailClient;
      const config = resolved.connection.toObject().config;
      const fromAddress =
        input.from ??
        this.readOptionalString(config, "fromAddress") ??
        this.readOptionalString(config, "from");

      if (!fromAddress) {
        throw new ValidationError("Resend requires a from email address");
      }

      const replyTo =
        input.replyTo ??
        this.readOptionalString(config, "replyTo") ??
        this.readOptionalString(config, "reply_to");

      return client.sendMail({
        apiKey: this.providers.getApiKey(resolved.secret ?? ""),
        from: fromAddress,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo,
      });
    }

    const accessToken = this.providers.getOauthAccessToken(resolved.secret ?? "");

    if (kind === "microsoft_graph_mail") {
      const client = this.providers.getMailClient(resolved.connection) as MicrosoftGraphMailClient;
      return client.sendMail({
        accessToken,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
    }

    const client = this.providers.getMailClient(resolved.connection) as GoogleGmailClient;
    return client.sendMail({
      accessToken,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  }

  async sync(input: {
    tenantId: string;
    connectionId: string;
    cursor?: string | null;
    limit?: number;
  }) {
    const resolved = await this.resolver.resolveById(input.tenantId, input.connectionId);
    const kind = resolved.connection.toObject().kind;

    if (kind === "resend") {
      throw new ValidationError("Resend does not support mailbox sync in this integration");
    }

    const accessToken = this.providers.getOauthAccessToken(resolved.secret ?? "");

    if (kind === "microsoft_graph_mail") {
      const client = this.providers.getMailClient(resolved.connection) as MicrosoftGraphMailClient;
      return client.syncMailbox({
        accessToken,
        deltaLink: input.cursor ?? undefined,
        top: input.limit,
      });
    }

    const client = this.providers.getMailClient(resolved.connection) as GoogleGmailClient;
    return client.syncMailbox({
      accessToken,
      pageToken: input.cursor ?? undefined,
      maxResults: input.limit,
    });
  }

  private readOptionalString(config: Record<string, unknown>, key: string): string | undefined {
    const value = config[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
