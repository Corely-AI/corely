import type {
  BillingProductKey,
  BillingOverview,
  CreateBillingCheckoutSessionInput,
  CreateBillingCheckoutSessionOutput,
  CreateBillingPortalSessionInput,
  CreateBillingPortalSessionOutput,
  GetBillingCurrentOutput,
  GetBillingOverviewOutput,
  GetBillingUpgradeContextOutput,
  GetBillingUsageOutput,
  StartBillingTrialInput,
  StartBillingTrialOutput,
} from "@corely/contracts";
import { CashManagementProductKey } from "@corely/contracts";
import { apiClient } from "./api-client";

export class BillingApi {
  async getCurrent(
    productKey: BillingProductKey = CashManagementProductKey
  ): Promise<GetBillingCurrentOutput> {
    return apiClient.get<GetBillingCurrentOutput>(
      `/billing/current?productKey=${encodeURIComponent(productKey)}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getUsage(
    productKey: BillingProductKey = CashManagementProductKey
  ): Promise<GetBillingUsageOutput> {
    return apiClient.get<GetBillingUsageOutput>(
      `/billing/usage?productKey=${encodeURIComponent(productKey)}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getOverview(
    productKey: BillingProductKey = CashManagementProductKey
  ): Promise<GetBillingOverviewOutput> {
    return apiClient.get<GetBillingOverviewOutput>(
      `/billing/overview?productKey=${encodeURIComponent(productKey)}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getUpgradeContext(
    productKey: BillingProductKey = CashManagementProductKey
  ): Promise<GetBillingUpgradeContextOutput> {
    return apiClient.get<GetBillingUpgradeContextOutput>(
      `/billing/upgrade-context?productKey=${encodeURIComponent(productKey)}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async startTrial(input: StartBillingTrialInput = {}): Promise<StartBillingTrialOutput> {
    return apiClient.post<StartBillingTrialOutput>(
      "/billing/trial/start",
      {
        ...input,
        productKey: input.productKey ?? CashManagementProductKey,
      },
      {
        correlationId: apiClient.generateCorrelationId(),
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async createCheckoutSession(
    input: CreateBillingCheckoutSessionInput
  ): Promise<CreateBillingCheckoutSessionOutput> {
    return apiClient.post<CreateBillingCheckoutSessionOutput>(
      "/billing/checkout-session",
      {
        ...input,
        productKey: input.productKey ?? CashManagementProductKey,
      },
      {
        correlationId: apiClient.generateCorrelationId(),
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async createPortalSession(
    input: CreateBillingPortalSessionInput = {}
  ): Promise<CreateBillingPortalSessionOutput> {
    return apiClient.post<CreateBillingPortalSessionOutput>(
      "/billing/portal-session",
      {
        ...input,
        productKey: input.productKey ?? CashManagementProductKey,
      },
      {
        correlationId: apiClient.generateCorrelationId(),
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );
  }

  async resync(
    productKey: BillingProductKey = CashManagementProductKey
  ): Promise<GetBillingCurrentOutput["subscription"]> {
    const result = await apiClient.post<{ subscription: GetBillingCurrentOutput["subscription"] }>(
      "/billing/resync",
      { productKey },
      {
        correlationId: apiClient.generateCorrelationId(),
        idempotencyKey: apiClient.generateIdempotencyKey(),
      }
    );

    return result.subscription;
  }
}

export const billingApi = new BillingApi();

export type { BillingOverview };
