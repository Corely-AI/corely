import type { PurchasingSettingsProps } from "./purchasing.types";

export class PurchasingSettingsAggregate {
  private props: PurchasingSettingsProps;

  constructor(props: PurchasingSettingsProps) {
    this.props = props;
  }

  static createDefault(params: {
    id: string;
    tenantId: string;
    now: Date;
  }): PurchasingSettingsAggregate {
    return new PurchasingSettingsAggregate({
      id: params.id,
      tenantId: params.tenantId,
      defaultPaymentTerms: null,
      defaultCurrency: "EUR",
      poNumberingPrefix: "PO-",
      poNextNumber: 1,
      billInternalRefPrefix: "BILL-",
      billNextNumber: 1,
      defaultAccountsPayableAccountId: null,
      defaultExpenseAccountId: null,
      defaultBankAccountId: null,
      autoPostOnBillPost: true,
      autoPostOnPaymentRecord: true,
      billDuplicateDetectionEnabled: true,
      approvalRequiredForBills: false,
      createdAt: params.now,
      updatedAt: params.now,
    });
  }

  updateSettings(
    patch: Partial<Omit<PurchasingSettingsProps, "id" | "tenantId" | "createdAt">>,
    now: Date
  ) {
    this.props = {
      ...this.props,
      ...patch,
      updatedAt: now,
    };
  }

  allocatePoNumber(): string {
    const prefix = this.props.poNumberingPrefix || "PO-";
    const number = `${prefix}${this.props.poNextNumber}`;
    this.props.poNextNumber += 1;
    return number;
  }

  allocateBillInternalRef(): string | null {
    if (!this.props.billInternalRefPrefix || this.props.billNextNumber == null) {
      return null;
    }
    const number = `${this.props.billInternalRefPrefix}${this.props.billNextNumber}`;
    this.props.billNextNumber += 1;
    return number;
  }

  toProps(): PurchasingSettingsProps {
    return { ...this.props };
  }

  static fromProps(props: PurchasingSettingsProps): PurchasingSettingsAggregate {
    return new PurchasingSettingsAggregate(props);
  }

  get tenantId(): string {
    return this.props.tenantId;
  }

  get defaultAccountsPayableAccountId(): string | null | undefined {
    return this.props.defaultAccountsPayableAccountId;
  }

  get defaultExpenseAccountId(): string | null | undefined {
    return this.props.defaultExpenseAccountId;
  }

  get defaultBankAccountId(): string | null | undefined {
    return this.props.defaultBankAccountId;
  }

  get autoPostOnBillPost(): boolean {
    return this.props.autoPostOnBillPost;
  }

  get autoPostOnPaymentRecord(): boolean {
    return this.props.autoPostOnPaymentRecord;
  }

  get billDuplicateDetectionEnabled(): boolean {
    return this.props.billDuplicateDetectionEnabled;
  }

  get approvalRequiredForBills(): boolean {
    return this.props.approvalRequiredForBills;
  }
}
