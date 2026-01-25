import type {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from "@corely/contracts";

export interface BankAccountRepositoryPort {
  create(
    tenantId: string,
    legalEntityId: string,
    input: CreateBankAccountInput
  ): Promise<BankAccount>;
  getById(tenantId: string, id: string): Promise<BankAccount | null>;
  listByLegalEntity(tenantId: string, legalEntityId: string): Promise<BankAccount[]>;
  update(tenantId: string, id: string, input: UpdateBankAccountInput): Promise<BankAccount>;
  setDefault(tenantId: string, legalEntityId: string, id: string, currency?: string): Promise<void>;
  deactivate(tenantId: string, id: string): Promise<BankAccount>;
  checkLabelExists(
    tenantId: string,
    legalEntityId: string,
    label: string,
    excludeId?: string
  ): Promise<boolean>;
}

export const BANK_ACCOUNT_REPOSITORY_PORT = "payment-methods/bank-account-repository";
