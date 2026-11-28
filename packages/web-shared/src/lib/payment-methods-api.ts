import { apiClient } from "./api-client";
import type { FeatureHttpClient } from "../session/feature-http-client";
import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
  ListBankAccountsOutput,
  PaymentMethod,
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
  ListPaymentMethodsOutput,
} from "@corely/contracts";

export class PaymentMethodsApi {
  constructor(private readonly http: FeatureHttpClient = apiClient) {}

  // Bank Accounts
  async listBankAccounts(
    legalEntityId: string,
    options?: { includeSensitive?: boolean }
  ): Promise<ListBankAccountsOutput> {
    const params = new URLSearchParams({
      legalEntityId,
    });

    if (options?.includeSensitive) {
      params.set("includeSensitive", "true");
    }

    return this.http.get<ListBankAccountsOutput>(`/payment-methods/bank-accounts?${params}`);
  }

  async createBankAccount(
    input: CreateBankAccountInput,
    legalEntityId: string
  ): Promise<BankAccount> {
    const result = await this.http.post<{ bankAccount: BankAccount }>(
      `/payment-methods/bank-accounts?legalEntityId=${legalEntityId}`,
      input,
      {
        idempotencyKey: this.http.generateIdempotencyKey(),
      }
    );
    return result.bankAccount;
  }

  async updateBankAccount(id: string, input: UpdateBankAccountInput): Promise<BankAccount> {
    const result = await this.http.patch<{ bankAccount: BankAccount }>(
      `/payment-methods/bank-accounts/${id}`,
      input
    );
    return result.bankAccount;
  }

  async setBankAccountDefault(id: string): Promise<BankAccount> {
    const result = await this.http.post<{ bankAccount: BankAccount }>(
      `/payment-methods/bank-accounts/${id}/set-default`,
      {}
    );
    return result.bankAccount;
  }

  async deactivateBankAccount(id: string): Promise<BankAccount> {
    const result = await this.http.post<{ bankAccount: BankAccount }>(
      `/payment-methods/bank-accounts/${id}/deactivate`,
      {}
    );
    return result.bankAccount;
  }

  // Payment Methods
  async listPaymentMethods(legalEntityId: string): Promise<ListPaymentMethodsOutput> {
    return this.http.get<ListPaymentMethodsOutput>(
      `/payment-methods?legalEntityId=${legalEntityId}`
    );
  }

  async createPaymentMethod(
    input: CreatePaymentMethodInput,
    legalEntityId: string
  ): Promise<PaymentMethod> {
    const result = await this.http.post<{ paymentMethod: PaymentMethod }>(
      `/payment-methods?legalEntityId=${legalEntityId}`,
      input,
      {
        idempotencyKey: this.http.generateIdempotencyKey(),
      }
    );
    return result.paymentMethod;
  }

  async updatePaymentMethod(id: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod> {
    const result = await this.http.patch<{ paymentMethod: PaymentMethod }>(
      `/payment-methods/${id}`,
      input
    );
    return result.paymentMethod;
  }

  async setPaymentMethodDefault(id: string): Promise<PaymentMethod> {
    const result = await this.http.post<{ paymentMethod: PaymentMethod }>(
      `/payment-methods/${id}/set-default`,
      {}
    );
    return result.paymentMethod;
  }

  async deactivatePaymentMethod(id: string): Promise<PaymentMethod> {
    const result = await this.http.post<{ paymentMethod: PaymentMethod }>(
      `/payment-methods/${id}/deactivate`,
      {}
    );
    return result.paymentMethod;
  }
}

export const paymentMethodsApi = new PaymentMethodsApi();
