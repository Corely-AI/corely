import { Module } from "@nestjs/common";
import { DataModule, PrismaAuditAdapter } from "@corely/data";
import { PurchasingController } from "./adapters/http/purchasing.controller";
import { PurchasingApplication } from "./application/purchasing.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { AUDIT_PORT, AuditPort } from "@corely/kernel";
import { KernelModule } from "../../shared/kernel/kernel.module";
import {
  IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { AccountingModule } from "../accounting";
import { AccountingApplication } from "../accounting/application/accounting.application";
import { IdentityModule } from "../identity";
import { PlatformModule } from "../platform";

import { PrismaPurchaseOrderRepository } from "./infrastructure/adapters/prisma-purchase-order-repository.adapter";
import { PrismaVendorBillRepository } from "./infrastructure/adapters/prisma-vendor-bill-repository.adapter";
import { PrismaBillPaymentRepository } from "./infrastructure/adapters/prisma-bill-payment-repository.adapter";
import { PrismaPurchasingSettingsRepository } from "./infrastructure/adapters/prisma-settings-repository.adapter";
import { PrismaPurchasingAccountMappingRepository } from "./infrastructure/adapters/prisma-account-mapping-repository.adapter";
import { PrismaSupplierQueryAdapter } from "./infrastructure/adapters/prisma-supplier-query.adapter";

import { PURCHASE_ORDER_REPO } from "./application/ports/purchase-order-repository.port";
import { VENDOR_BILL_REPO } from "./application/ports/vendor-bill-repository.port";
import { BILL_PAYMENT_REPO } from "./application/ports/bill-payment-repository.port";
import { PURCHASING_SETTINGS_REPO } from "./application/ports/settings-repository.port";
import { PURCHASING_ACCOUNT_MAPPING_REPO } from "./application/ports/account-mapping-repository.port";
import { SUPPLIER_QUERY_PORT } from "./application/ports/supplier-query.port";

import { CreatePurchaseOrderUseCase } from "./application/use-cases/create-purchase-order.usecase";
import { UpdatePurchaseOrderUseCase } from "./application/use-cases/update-purchase-order.usecase";
import { ApprovePurchaseOrderUseCase } from "./application/use-cases/approve-purchase-order.usecase";
import { SendPurchaseOrderUseCase } from "./application/use-cases/send-purchase-order.usecase";
import { ReceivePurchaseOrderUseCase } from "./application/use-cases/receive-purchase-order.usecase";
import { ClosePurchaseOrderUseCase } from "./application/use-cases/close-purchase-order.usecase";
import { CancelPurchaseOrderUseCase } from "./application/use-cases/cancel-purchase-order.usecase";
import { GetPurchaseOrderUseCase } from "./application/use-cases/get-purchase-order.usecase";
import { ListPurchaseOrdersUseCase } from "./application/use-cases/list-purchase-orders.usecase";

import { CreateVendorBillUseCase } from "./application/use-cases/create-vendor-bill.usecase";
import { UpdateVendorBillUseCase } from "./application/use-cases/update-vendor-bill.usecase";
import { ApproveVendorBillUseCase } from "./application/use-cases/approve-vendor-bill.usecase";
import { PostVendorBillUseCase } from "./application/use-cases/post-vendor-bill.usecase";
import { VoidVendorBillUseCase } from "./application/use-cases/void-vendor-bill.usecase";
import { GetVendorBillUseCase } from "./application/use-cases/get-vendor-bill.usecase";
import { ListVendorBillsUseCase } from "./application/use-cases/list-vendor-bills.usecase";

import { RecordBillPaymentUseCase } from "./application/use-cases/record-bill-payment.usecase";
import { ListBillPaymentsUseCase } from "./application/use-cases/list-bill-payments.usecase";

import { GetPurchasingSettingsUseCase } from "./application/use-cases/get-purchasing-settings.usecase";
import { UpdatePurchasingSettingsUseCase } from "./application/use-cases/update-purchasing-settings.usecase";

import { ListAccountMappingsUseCase } from "./application/use-cases/list-account-mappings.usecase";
import { UpsertAccountMappingUseCase } from "./application/use-cases/upsert-account-mapping.usecase";

import { ListSuppliersUseCase } from "./application/use-cases/list-suppliers.usecase";

@Module({
  imports: [DataModule, KernelModule, IdentityModule, PlatformModule, AccountingModule],
  controllers: [PurchasingController],
  providers: [
    PrismaPurchaseOrderRepository,
    PrismaVendorBillRepository,
    PrismaBillPaymentRepository,
    PrismaPurchasingSettingsRepository,
    PrismaPurchasingAccountMappingRepository,
    PrismaSupplierQueryAdapter,
    { provide: PURCHASE_ORDER_REPO, useExisting: PrismaPurchaseOrderRepository },
    { provide: VENDOR_BILL_REPO, useExisting: PrismaVendorBillRepository },
    { provide: BILL_PAYMENT_REPO, useExisting: PrismaBillPaymentRepository },
    { provide: PURCHASING_SETTINGS_REPO, useExisting: PrismaPurchasingSettingsRepository },
    {
      provide: PURCHASING_ACCOUNT_MAPPING_REPO,
      useExisting: PrismaPurchasingAccountMappingRepository,
    },
    { provide: SUPPLIER_QUERY_PORT, useExisting: PrismaSupplierQueryAdapter },
    {
      provide: CreatePurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new CreatePurchaseOrderUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: UpdatePurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new UpdatePurchaseOrderUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: ApprovePurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new ApprovePurchaseOrderUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: SendPurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new SendPurchaseOrderUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: ReceivePurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new ReceivePurchaseOrderUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: ClosePurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new ClosePurchaseOrderUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: CancelPurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new CancelPurchaseOrderUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetPurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new GetPurchaseOrderUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: ListPurchaseOrdersUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        audit: AuditPort
      ) =>
        new ListPurchaseOrdersUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          audit,
        }),
      inject: [
        PURCHASE_ORDER_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AUDIT_PORT,
      ],
    },
    {
      provide: CreateVendorBillUseCase,
      useFactory: (
        repo: PrismaVendorBillRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new CreateVendorBillUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        PURCHASING_SETTINGS_REPO,
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: UpdateVendorBillUseCase,
      useFactory: (
        repo: PrismaVendorBillRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new UpdateVendorBillUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        PURCHASING_SETTINGS_REPO,
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: ApproveVendorBillUseCase,
      useFactory: (
        repo: PrismaVendorBillRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new ApproveVendorBillUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        PURCHASING_SETTINGS_REPO,
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: PostVendorBillUseCase,
      useFactory: (
        repo: PrismaVendorBillRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new PostVendorBillUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        PURCHASING_SETTINGS_REPO,
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: VoidVendorBillUseCase,
      useFactory: (
        repo: PrismaVendorBillRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new VoidVendorBillUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        PURCHASING_SETTINGS_REPO,
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetVendorBillUseCase,
      useFactory: (
        repo: PrismaVendorBillRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new GetVendorBillUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        PURCHASING_SETTINGS_REPO,
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: ListVendorBillsUseCase,
      useFactory: (
        repo: PrismaVendorBillRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        supplierQuery: PrismaSupplierQueryAdapter,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new ListVendorBillsUseCase({
          logger: new NestLoggerAdapter(),
          repo,
          settingsRepo,
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          supplierQuery,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        PURCHASING_SETTINGS_REPO,
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        SUPPLIER_QUERY_PORT,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: RecordBillPaymentUseCase,
      useFactory: (
        billRepo: PrismaVendorBillRepository,
        paymentRepo: PrismaBillPaymentRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new RecordBillPaymentUseCase({
          logger: new NestLoggerAdapter(),
          billRepo,
          paymentRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        BILL_PAYMENT_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: ListBillPaymentsUseCase,
      useFactory: (
        billRepo: PrismaVendorBillRepository,
        paymentRepo: PrismaBillPaymentRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any,
        accounting: AccountingApplication,
        audit: AuditPort
      ) =>
        new ListBillPaymentsUseCase({
          logger: new NestLoggerAdapter(),
          billRepo,
          paymentRepo,
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
          accounting,
          audit,
        }),
      inject: [
        VENDOR_BILL_REPO,
        BILL_PAYMENT_REPO,
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        AccountingApplication,
        AUDIT_PORT,
      ],
    },
    {
      provide: GetPurchasingSettingsUseCase,
      useFactory: (
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any
      ) =>
        new GetPurchasingSettingsUseCase({
          logger: new NestLoggerAdapter(),
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
        }),
      inject: [
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpdatePurchasingSettingsUseCase,
      useFactory: (
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any
      ) =>
        new UpdatePurchasingSettingsUseCase({
          logger: new NestLoggerAdapter(),
          settingsRepo,
          idempotency,
          idGenerator: idGen,
          clock,
        }),
      inject: [
        PURCHASING_SETTINGS_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ListAccountMappingsUseCase,
      useFactory: (
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any
      ) =>
        new ListAccountMappingsUseCase({
          logger: new NestLoggerAdapter(),
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
        }),
      inject: [
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: UpsertAccountMappingUseCase,
      useFactory: (
        mappingRepo: PrismaPurchasingAccountMappingRepository,
        idempotency: IdempotencyStoragePort,
        idGen: any,
        clock: any
      ) =>
        new UpsertAccountMappingUseCase({
          logger: new NestLoggerAdapter(),
          mappingRepo,
          idempotency,
          idGenerator: idGen,
          clock,
        }),
      inject: [
        PURCHASING_ACCOUNT_MAPPING_REPO,
        IDEMPOTENCY_STORAGE_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: ListSuppliersUseCase,
      useFactory: (supplierQuery: PrismaSupplierQueryAdapter) =>
        new ListSuppliersUseCase({
          logger: new NestLoggerAdapter(),
          supplierQuery,
        }),
      inject: [SUPPLIER_QUERY_PORT],
    },
    {
      provide: PurchasingApplication,
      useFactory: (
        createPurchaseOrder: CreatePurchaseOrderUseCase,
        updatePurchaseOrder: UpdatePurchaseOrderUseCase,
        approvePurchaseOrder: ApprovePurchaseOrderUseCase,
        sendPurchaseOrder: SendPurchaseOrderUseCase,
        receivePurchaseOrder: ReceivePurchaseOrderUseCase,
        closePurchaseOrder: ClosePurchaseOrderUseCase,
        cancelPurchaseOrder: CancelPurchaseOrderUseCase,
        getPurchaseOrder: GetPurchaseOrderUseCase,
        listPurchaseOrders: ListPurchaseOrdersUseCase,
        createVendorBill: CreateVendorBillUseCase,
        updateVendorBill: UpdateVendorBillUseCase,
        approveVendorBill: ApproveVendorBillUseCase,
        postVendorBill: PostVendorBillUseCase,
        voidVendorBill: VoidVendorBillUseCase,
        getVendorBill: GetVendorBillUseCase,
        listVendorBills: ListVendorBillsUseCase,
        recordBillPayment: RecordBillPaymentUseCase,
        listBillPayments: ListBillPaymentsUseCase,
        getSettings: GetPurchasingSettingsUseCase,
        updateSettings: UpdatePurchasingSettingsUseCase,
        listAccountMappings: ListAccountMappingsUseCase,
        upsertAccountMapping: UpsertAccountMappingUseCase,
        listSuppliers: ListSuppliersUseCase
      ) =>
        new PurchasingApplication(
          createPurchaseOrder,
          updatePurchaseOrder,
          approvePurchaseOrder,
          sendPurchaseOrder,
          receivePurchaseOrder,
          closePurchaseOrder,
          cancelPurchaseOrder,
          getPurchaseOrder,
          listPurchaseOrders,
          createVendorBill,
          updateVendorBill,
          approveVendorBill,
          postVendorBill,
          voidVendorBill,
          getVendorBill,
          listVendorBills,
          recordBillPayment,
          listBillPayments,
          getSettings,
          updateSettings,
          listAccountMappings,
          upsertAccountMapping,
          listSuppliers
        ),
      inject: [
        CreatePurchaseOrderUseCase,
        UpdatePurchaseOrderUseCase,
        ApprovePurchaseOrderUseCase,
        SendPurchaseOrderUseCase,
        ReceivePurchaseOrderUseCase,
        ClosePurchaseOrderUseCase,
        CancelPurchaseOrderUseCase,
        GetPurchaseOrderUseCase,
        ListPurchaseOrdersUseCase,
        CreateVendorBillUseCase,
        UpdateVendorBillUseCase,
        ApproveVendorBillUseCase,
        PostVendorBillUseCase,
        VoidVendorBillUseCase,
        GetVendorBillUseCase,
        ListVendorBillsUseCase,
        RecordBillPaymentUseCase,
        ListBillPaymentsUseCase,
        GetPurchasingSettingsUseCase,
        UpdatePurchasingSettingsUseCase,
        ListAccountMappingsUseCase,
        UpsertAccountMappingUseCase,
        ListSuppliersUseCase,
      ],
    },
  ],
  exports: [PurchasingApplication],
})
export class PurchasingModule {}
