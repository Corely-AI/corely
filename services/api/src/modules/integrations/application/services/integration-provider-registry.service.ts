import { Injectable } from "@nestjs/common";
import { ValidationError } from "@corely/kernel";
import { SumUpCashlessClient } from "@corely/integrations-sumup";
import { AdyenCashlessClient } from "@corely/integrations-adyen";
import { MicrosoftGraphMailClient } from "@corely/integrations-microsoft-graph-mail";
import { GoogleGmailClient } from "@corely/integrations-google-gmail";
import type { IntegrationConnectionEntity } from "../../domain/integration-connection.entity";

@Injectable()
export class IntegrationProviderRegistryService {
  getCashlessClient(connection: IntegrationConnectionEntity, secret: string) {
    const kind = connection.toObject().kind;

    if (kind === "sumup") {
      const config = connection.toObject().config;
      const baseUrl = this.readOptionalString(config, "baseUrl");
      return new SumUpCashlessClient({
        apiKey: secret,
        baseUrl,
      });
    }

    if (kind === "adyen") {
      return new AdyenCashlessClient();
    }

    throw new ValidationError("Connection does not support cashless payments", { kind });
  }

  getMailClient(connection: IntegrationConnectionEntity) {
    const kind = connection.toObject().kind;

    if (kind === "microsoft_graph_mail") {
      return new MicrosoftGraphMailClient();
    }

    if (kind === "google_gmail") {
      return new GoogleGmailClient();
    }

    throw new ValidationError("Connection does not support mail capabilities", { kind });
  }

  getOauthAccessToken(secret: string): string {
    try {
      const parsed = JSON.parse(secret) as { accessToken?: string };
      if (typeof parsed.accessToken === "string" && parsed.accessToken.length > 0) {
        return parsed.accessToken;
      }
    } catch {
      // Fall through to plain token fallback.
    }

    if (!secret) {
      throw new ValidationError("OAuth access token is missing");
    }

    return secret;
  }

  private readOptionalString(config: Record<string, unknown>, key: string): string | undefined {
    const value = config[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
  }
}
