import type {
  CreatePurchaseOrderUseCase,
  UpdatePurchaseOrderUseCase,
  ApprovePurchaseOrderUseCase,
  SendPurchaseOrderUseCase,
  ReceivePurchaseOrderUseCase,
  ClosePurchaseOrderUseCase,
  CancelPurchaseOrderUseCase,
  GetPurchaseOrderUseCase,
  ListPurchaseOrdersUseCase,
} from "./use-cases/purchase-orders.usecases";
import type {
  CreateVendorBillUseCase,
  UpdateVendorBillUseCase,
  ApproveVendorBillUseCase,
  PostVendorBillUseCase,
  VoidVendorBillUseCase,
  GetVendorBillUseCase,
  ListVendorBillsUseCase,
} from "./use-cases/vendor-bills.usecases";
import type {
  RecordBillPaymentUseCase,
  ListBillPaymentsUseCase,
} from "./use-cases/bill-payments.usecases";
import type {
  GetPurchasingSettingsUseCase,
  UpdatePurchasingSettingsUseCase,
} from "./use-cases/settings.usecases";
import type {
  ListAccountMappingsUseCase,
  UpsertAccountMappingUseCase,
} from "./use-cases/account-mappings.usecases";
import type { ListSuppliersUseCase } from "./use-cases/suppliers.usecases";

export class PurchasingApplication {
  constructor(
    // Purchase Orders
    public readonly createPurchaseOrder: CreatePurchaseOrderUseCase,
    public readonly updatePurchaseOrder: UpdatePurchaseOrderUseCase,
    public readonly approvePurchaseOrder: ApprovePurchaseOrderUseCase,
    public readonly sendPurchaseOrder: SendPurchaseOrderUseCase,
    public readonly receivePurchaseOrder: ReceivePurchaseOrderUseCase,
    public readonly closePurchaseOrder: ClosePurchaseOrderUseCase,
    public readonly cancelPurchaseOrder: CancelPurchaseOrderUseCase,
    public readonly getPurchaseOrder: GetPurchaseOrderUseCase,
    public readonly listPurchaseOrders: ListPurchaseOrdersUseCase,
    // Vendor Bills
    public readonly createVendorBill: CreateVendorBillUseCase,
    public readonly updateVendorBill: UpdateVendorBillUseCase,
    public readonly approveVendorBill: ApproveVendorBillUseCase,
    public readonly postVendorBill: PostVendorBillUseCase,
    public readonly voidVendorBill: VoidVendorBillUseCase,
    public readonly getVendorBill: GetVendorBillUseCase,
    public readonly listVendorBills: ListVendorBillsUseCase,
    // Payments
    public readonly recordBillPayment: RecordBillPaymentUseCase,
    public readonly listBillPayments: ListBillPaymentsUseCase,
    // Settings & Mappings
    public readonly getSettings: GetPurchasingSettingsUseCase,
    public readonly updateSettings: UpdatePurchasingSettingsUseCase,
    public readonly listAccountMappings: ListAccountMappingsUseCase,
    public readonly upsertAccountMapping: UpsertAccountMappingUseCase,
    // Suppliers
    public readonly listSuppliers: ListSuppliersUseCase
  ) {}
}
