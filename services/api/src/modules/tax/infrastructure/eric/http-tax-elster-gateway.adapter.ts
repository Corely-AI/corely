import { Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { ExternalServiceError } from "@corely/kernel";
import {
  TaxElsterGatewayRequestSchema,
  TaxElsterGatewayResultSchema,
  type TaxElsterGatewayConnectionStatus,
  type TaxElsterGatewayRequest,
  type TaxElsterGatewayResult,
} from "@corely/contracts";
import { TaxElsterGatewayPort } from "../../application/ports/tax-elster-gateway.port";

@Injectable()
export class HttpTaxElsterGatewayAdapter extends TaxElsterGatewayPort {
  constructor(private readonly env: EnvService) {
    super();
  }

  getConnectionStatus(): TaxElsterGatewayConnectionStatus {
    return this.env.ELSTER_GATEWAY_BASE_URL ? "connected" : "notConfigured";
  }

  async execute(request: TaxElsterGatewayRequest): Promise<TaxElsterGatewayResult> {
    const parsedRequest = TaxElsterGatewayRequestSchema.parse(request);
    const baseUrl = this.env.ELSTER_GATEWAY_BASE_URL;
    if (!baseUrl) {
      throw new ExternalServiceError("ELSTER gateway is not configured", {
        code: "Tax:ElsterNotConfigured",
        retryable: false,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.env.ELSTER_GATEWAY_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/v1/elster/execute`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-correlation-id": parsedRequest.correlationId,
          "x-request-id": parsedRequest.requestId,
          ...(this.env.ELSTER_GATEWAY_API_KEY
            ? { authorization: `Bearer ${this.env.ELSTER_GATEWAY_API_KEY}` }
            : {}),
        },
        body: JSON.stringify(parsedRequest),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ExternalServiceError("ELSTER gateway request failed", {
          code: "Tax:ElsterGatewayHttpError",
          retryable: response.status >= 500 || response.status === 429,
          status: response.status,
          body: errorText,
        });
      }

      const payload = (await response.json()) as unknown;
      const parsedResponse = TaxElsterGatewayResultSchema.safeParse(payload);
      if (!parsedResponse.success) {
        throw new ExternalServiceError("ELSTER gateway returned an invalid response shape", {
          code: "Tax:ElsterGatewayInvalidResponse",
          retryable: false,
          issues: parsedResponse.error.issues,
        });
      }

      return parsedResponse.data;
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ExternalServiceError("ELSTER gateway request timed out", {
          code: "Tax:ElsterGatewayTimeout",
          retryable: true,
        });
      }

      throw new ExternalServiceError("ELSTER gateway request failed", {
        code: "Tax:ElsterGatewayRequestFailed",
        retryable: true,
        cause: error instanceof Error ? error.message : String(error),
      });
    } finally {
      clearTimeout(timeout);
    }
  }
}
