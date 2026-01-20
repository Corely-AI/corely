import type {
  PaymentMethod,
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from "@corely/contracts";

export interface PaymentMethodRepositoryPort {
  create(
    tenantId: string,
    legalEntityId: string,
    input: CreatePaymentMethodInput
  ): Promise<PaymentMethod>;
  getById(tenantId: string, id: string): Promise<PaymentMethod | null>;
  listByLegalEntity(tenantId: string, legalEntityId: string): Promise<PaymentMethod[]>;
  getDefault(tenantId: string, legalEntityId: string): Promise<PaymentMethod | null>;
  update(tenantId: string, id: string, input: UpdatePaymentMethodInput): Promise<PaymentMethod>;
  setDefault(tenantId: string, legalEntityId: string, id: string): Promise<void>;
  deactivate(tenantId: string, id: string): Promise<PaymentMethod>;
  checkLabelExists(
    tenantId: string,
    legalEntityId: string,
    label: string,
    excludeId?: string
  ): Promise<boolean>;
  getBankAccountWithPaymentMethods(
    tenantId: string,
    bankAccountId: string
  ): Promise<PaymentMethod[]>;
}

export const PAYMENT_METHOD_REPOSITORY_PORT = "payment-methods/payment-method-repository";
