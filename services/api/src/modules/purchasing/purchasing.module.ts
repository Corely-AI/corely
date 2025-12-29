import { Module } from "@nestjs/common";
import { DataModule, PrismaAuditAdapter } from "@kerniflow/data";
import { PurchasingController } from "./adapters/http/purchasing.controller";
import { PurchasingApplication } from "./application/purchasing.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import {
  IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../shared/ports/idempotency-storage.port";
import { PrismaIdempotencyStorageAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency-storage.adapter";
import { AUDIT_PORT, AuditPort } from "@kerniflow/kernel";
import { AccountingModule } from "../accounting";
import { AccountingApplication } from "../accounting/application/accounting.application";
import { IdentityModule } from "../identity";

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

import {
  CreatePurchaseOrderUseCase,
  UpdatePurchaseOrderUseCase,
  ApprovePurchaseOrderUseCase,
  SendPurchaseOrderUseCase,
  ReceivePurchaseOrderUseCase,
  ClosePurchaseOrderUseCase,
  CancelPurchaseOrderUseCase,
  GetPurchaseOrderUseCase,
  ListPurchaseOrdersUseCase,
} from "./application/use-cases/purchase-orders.usecases";
import {
  CreateVendorBillUseCase,
  UpdateVendorBillUseCase,
  ApproveVendorBillUseCase,
  PostVendorBillUseCase,
  VoidVendorBillUseCase,
  GetVendorBillUseCase,
  ListVendorBillsUseCase,
} from "./application/use-cases/vendor-bills.usecases";
import {
  RecordBillPaymentUseCase,
  ListBillPaymentsUseCase,
} from "./application/use-cases/bill-payments.usecases";
import {
  GetPurchasingSettingsUseCase,
  UpdatePurchasingSettingsUseCase,
} from "./application/use-cases/settings.usecases";
import {
  ListAccountMappingsUseCase,
  UpsertAccountMappingUseCase,
} from "./application/use-cases/account-mappings.usecases";
import { ListSuppliersUseCase } from "./application/use-cases/suppliers.usecases";

@Module({
  imports: [DataModule, IdentityModule, AccountingModule],
  controllers: [PurchasingController],
  providers: [
    PrismaPurchaseOrderRepository,
    PrismaVendorBillRepository,
    PrismaBillPaymentRepository,
    PrismaPurchasingSettingsRepository,
    PrismaPurchasingAccountMappingRepository,
    PrismaSupplierQueryAdapter,
    PrismaAuditAdapter,
    PrismaIdempotencyStorageAdapter,
    SystemIdGenerator,
    SystemClock,
    { provide: PURCHASE_ORDER_REPO, useExisting: PrismaPurchaseOrderRepository },
    { provide: VENDOR_BILL_REPO, useExisting: PrismaVendorBillRepository },
    { provide: BILL_PAYMENT_REPO, useExisting: PrismaBillPaymentRepository },
    { provide: PURCHASING_SETTINGS_REPO, useExisting: PrismaPurchasingSettingsRepository },
    {
      provide: PURCHASING_ACCOUNT_MAPPING_REPO,
      useExisting: PrismaPurchasingAccountMappingRepository,
    },
    { provide: SUPPLIER_QUERY_PORT, useExisting: PrismaSupplierQueryAdapter },
    { provide: AUDIT_PORT, useExisting: PrismaAuditAdapter },
    { provide: IDEMPOTENCY_STORAGE_PORT_TOKEN, useExisting: PrismaIdempotencyStorageAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    {
      provide: CreatePurchaseOrderUseCase,
      useFactory: (
        repo: PrismaPurchaseOrderRepository,
        settingsRepo: PrismaPurchasingSettingsRepository,
        idempotency: IdempotencyStoragePort,
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock,
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
        idGen: SystemIdGenerator,
        clock: SystemClock
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
        idGen: SystemIdGenerator,
        clock: SystemClock
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
        idGen: SystemIdGenerator,
        clock: SystemClock
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
        idGen: SystemIdGenerator,
        clock: SystemClock
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
