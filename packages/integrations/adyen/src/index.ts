import { ExternalServiceError } from "@corely/domain";
import type { CashlessCreateSessionInput, CashlessSession } from "@corely/integrations-core";

export class AdyenCashlessClient {
  async createSession(_input: CashlessCreateSessionInput): Promise<CashlessSession> {
    throw new ExternalServiceError("Adyen cashless adapter is not implemented yet", {
      code: "ExternalService:adyen",
      retryable: false,
    });
  }

  async getStatus(_providerRef: string): Promise<CashlessSession> {
    throw new ExternalServiceError("Adyen cashless adapter is not implemented yet", {
      code: "ExternalService:adyen",
      retryable: false,
    });
  }
}
