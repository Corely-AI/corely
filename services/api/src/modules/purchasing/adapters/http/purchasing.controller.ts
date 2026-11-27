import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreatePurchaseOrderInputSchema,
  UpdatePurchaseOrderInputSchema,
  ApprovePurchaseOrderInputSchema,
  SendPurchaseOrderInputSchema,
  ReceivePurchaseOrderInputSchema,
  ClosePurchaseOrderInputSchema,
  CancelPurchaseOrderInputSchema,
  GetPurchaseOrderInputSchema,
  ListPurchaseOrdersInputSchema,
  CreateVendorBillInputSchema,
  UpdateVendorBillInputSchema,
  ApproveVendorBillInputSchema,
  PostVendorBillInputSchema,
  VoidVendorBillInputSchema,
  GetVendorBillInputSchema,
  ListVendorBillsInputSchema,
  RecordBillPaymentInputSchema,
  ListBillPaymentsInputSchema,
  GetPurchasingSettingsInputSchema,
  UpdatePurchasingSettingsInputSchema,
  ListAccountMappingsInputSchema,
  UpsertAccountMappingInputSchema,
  ListSuppliersInputSchema,
} from "@corely/contracts";
import { PurchasingApplication } from "../../application/purchasing.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { RbacGuard, RequirePermission } from "@/modules/identity/adapters/http/rbac.guard";
import { AuthGuard } from "@/modules/identity/adapters/http/auth.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";

@Controller("purchasing")
@UseGuards(AuthGuard, WorkspaceCapabilityGuard, RbacGuard)
@RequireWorkspaceCapability("purchasing.purchaseOrders")
export class PurchasingController {
  constructor(private readonly app: PurchasingApplication) {}

  // ===== Suppliers =====
  @Get("suppliers")
  @RequirePermission("purchasing.read")
  async listSuppliers(@Query() query: any, @Req() req: Request) {
    const input = ListSuppliersInputSchema.parse({
      search: query.search,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listSuppliers.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Purchase Orders =====
  @Post("purchase-orders")
  async createPurchaseOrder(@Body() body: unknown, @Req() req: Request) {
    const input = CreatePurchaseOrderInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createPurchaseOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("purchase-orders/:id")
  async updatePurchaseOrder(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdatePurchaseOrderInputSchema.parse({
      ...(body as object),
      purchaseOrderId: id,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updatePurchaseOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("purchase-orders/:id/approve")
  async approvePurchaseOrder(@Param("id") id: string, @Req() req: Request) {
    const input = ApprovePurchaseOrderInputSchema.parse({ purchaseOrderId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.approvePurchaseOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("purchase-orders/:id/send")
  async sendPurchaseOrder(@Param("id") id: string, @Req() req: Request) {
    const input = SendPurchaseOrderInputSchema.parse({ purchaseOrderId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.sendPurchaseOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("purchase-orders/:id/receive")
  async receivePurchaseOrder(@Param("id") id: string, @Req() req: Request) {
    const input = ReceivePurchaseOrderInputSchema.parse({ purchaseOrderId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.receivePurchaseOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("purchase-orders/:id/close")
  async closePurchaseOrder(@Param("id") id: string, @Req() req: Request) {
    const input = ClosePurchaseOrderInputSchema.parse({ purchaseOrderId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.closePurchaseOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("purchase-orders/:id/cancel")
  async cancelPurchaseOrder(@Param("id") id: string, @Req() req: Request) {
    const input = CancelPurchaseOrderInputSchema.parse({ purchaseOrderId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.cancelPurchaseOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("purchase-orders/:id")
  async getPurchaseOrder(@Param("id") id: string, @Req() req: Request) {
    const input = GetPurchaseOrderInputSchema.parse({ purchaseOrderId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPurchaseOrder.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("purchase-orders")
  async listPurchaseOrders(@Query() query: any, @Req() req: Request) {
    const input = ListPurchaseOrdersInputSchema.parse({
      status: query.status,
      supplierPartyId: query.supplierPartyId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      search: query.search,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listPurchaseOrders.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Vendor Bills =====
  @Post("vendor-bills")
  @RequirePermission("purchasing.write")
  async createVendorBill(@Body() body: unknown, @Req() req: Request) {
    const input = CreateVendorBillInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createVendorBill.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("vendor-bills/:id")
  @RequirePermission("purchasing.write")
  async updateVendorBill(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = UpdateVendorBillInputSchema.parse({ ...(body as object), vendorBillId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateVendorBill.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("vendor-bills/:id/approve")
  @RequirePermission("purchasing.write")
  async approveVendorBill(@Param("id") id: string, @Req() req: Request) {
    const input = ApproveVendorBillInputSchema.parse({ vendorBillId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.approveVendorBill.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("vendor-bills/:id/post")
  @RequirePermission("purchasing.write")
  async postVendorBill(@Param("id") id: string, @Req() req: Request) {
    const input = PostVendorBillInputSchema.parse({ vendorBillId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.postVendorBill.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("vendor-bills/:id/void")
  @RequirePermission("purchasing.write")
  async voidVendorBill(@Param("id") id: string, @Req() req: Request) {
    const input = VoidVendorBillInputSchema.parse({ vendorBillId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.voidVendorBill.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("vendor-bills/:id")
  @RequirePermission("purchasing.read")
  async getVendorBill(@Param("id") id: string, @Req() req: Request) {
    const input = GetVendorBillInputSchema.parse({ vendorBillId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getVendorBill.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("vendor-bills")
  @RequirePermission("purchasing.read")
  async listVendorBills(@Query() query: any, @Req() req: Request) {
    const input = ListVendorBillsInputSchema.parse({
      status: query.status,
      supplierPartyId: query.supplierPartyId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      dueFromDate: query.dueFromDate,
      dueToDate: query.dueToDate,
      search: query.search,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listVendorBills.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Payments =====
  @Post("vendor-bills/:id/payments")
  @RequirePermission("purchasing.write")
  async recordBillPayment(@Param("id") id: string, @Body() body: unknown, @Req() req: Request) {
    const input = RecordBillPaymentInputSchema.parse({ ...(body as object), vendorBillId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.recordBillPayment.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("vendor-bills/:id/payments")
  @RequirePermission("purchasing.read")
  async listBillPayments(@Param("id") id: string, @Req() req: Request) {
    const input = ListBillPaymentsInputSchema.parse({ vendorBillId: id });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listBillPayments.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Settings =====
  @Get("settings")
  async getSettings(@Req() req: Request) {
    const input = GetPurchasingSettingsInputSchema.parse({});
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getSettings.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("settings")
  async updateSettings(@Body() body: unknown, @Req() req: Request) {
    const input = UpdatePurchasingSettingsInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateSettings.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Account Mappings =====
  @Get("account-mappings")
  async listAccountMappings(@Query() query: any, @Req() req: Request) {
    const input = ListAccountMappingsInputSchema.parse({
      supplierPartyId: query.supplierPartyId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listAccountMappings.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("account-mappings")
  async upsertAccountMapping(@Body() body: unknown, @Req() req: Request) {
    const input = UpsertAccountMappingInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.upsertAccountMapping.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
