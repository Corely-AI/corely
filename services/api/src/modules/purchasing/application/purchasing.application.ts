import type { CreatePurchaseOrderUseCase } from "./use-cases/create-purchase-order.usecase";
import type { UpdatePurchaseOrderUseCase } from "./use-cases/update-purchase-order.usecase";
import type { ApprovePurchaseOrderUseCase } from "./use-cases/approve-purchase-order.usecase";
import type { SendPurchaseOrderUseCase } from "./use-cases/send-purchase-order.usecase";
import type { ReceivePurchaseOrderUseCase } from "./use-cases/receive-purchase-order.usecase";
import type { ClosePurchaseOrderUseCase } from "./use-cases/close-purchase-order.usecase";
import type { CancelPurchaseOrderUseCase } from "./use-cases/cancel-purchase-order.usecase";
import type { GetPurchaseOrderUseCase } from "./use-cases/get-purchase-order.usecase";
import type { ListPurchaseOrdersUseCase } from "./use-cases/list-purchase-orders.usecase";

import type { CreateVendorBillUseCase } from "./use-cases/create-vendor-bill.usecase";
import type { UpdateVendorBillUseCase } from "./use-cases/update-vendor-bill.usecase";
import type { ApproveVendorBillUseCase } from "./use-cases/approve-vendor-bill.usecase";
import type { PostVendorBillUseCase } from "./use-cases/post-vendor-bill.usecase";
import type { VoidVendorBillUseCase } from "./use-cases/void-vendor-bill.usecase";
import type { GetVendorBillUseCase } from "./use-cases/get-vendor-bill.usecase";
import type { ListVendorBillsUseCase } from "./use-cases/list-vendor-bills.usecase";

import type { RecordBillPaymentUseCase } from "./use-cases/record-bill-payment.usecase";
import type { ListBillPaymentsUseCase } from "./use-cases/list-bill-payments.usecase";

import type { GetPurchasingSettingsUseCase } from "./use-cases/get-purchasing-settings.usecase";
import type { UpdatePurchasingSettingsUseCase } from "./use-cases/update-purchasing-settings.usecase";

import type { ListAccountMappingsUseCase } from "./use-cases/list-account-mappings.usecase";
import type { UpsertAccountMappingUseCase } from "./use-cases/upsert-account-mapping.usecase";

import type { ListSuppliersUseCase } from "./use-cases/list-suppliers.usecase";

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
