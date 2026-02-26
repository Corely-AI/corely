import { Injectable } from "@nestjs/common";
import { GoogleGmailClient } from "@corely/integrations-google-gmail";
import { MicrosoftGraphMailClient } from "@corely/integrations-microsoft-graph-mail";
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
  }): Promise<{ providerMessageId?: string }> {
    const resolved = await this.resolver.resolveById(input.tenantId, input.connectionId);
    const accessToken = this.providers.getOauthAccessToken(resolved.secret ?? "");
    const kind = resolved.connection.toObject().kind;

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
    const accessToken = this.providers.getOauthAccessToken(resolved.secret ?? "");
    const kind = resolved.connection.toObject().kind;

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
}
