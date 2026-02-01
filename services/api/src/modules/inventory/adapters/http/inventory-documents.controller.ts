import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  CreateInventoryDocumentInputSchema,
  UpdateInventoryDocumentInputSchema,
  GetInventoryDocumentInputSchema,
  ListInventoryDocumentsInputSchema,
  ConfirmInventoryDocumentInputSchema,
  PostInventoryDocumentInputSchema,
  CancelInventoryDocumentInputSchema,
} from "@corely/contracts";
import { InventoryDocumentsApplication } from "../../application/inventory-documents.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";

@Controller("inventory/documents")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("inventory.basic")
export class InventoryDocumentsController {
  constructor(private readonly app: InventoryDocumentsApplication) {}

  @Get()
  @RequirePermission("inventory.documents.read")
  async listDocuments(@Query() query: any, @Req() req: Request) {
    const input = ListInventoryDocumentsInputSchema.parse({
      type: query.type,
      status: query.status,
      partyId: query.partyId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      search: query.search,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listDocuments.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post()
  @RequirePermission("inventory.documents.manage")
  async createDocument(@Body() body: unknown, @Req() req: Request) {
    const input = CreateInventoryDocumentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":documentId")
  @RequirePermission("inventory.documents.read")
  async getDocument(@Param("documentId") documentId: string, @Req() req: Request) {
    const input = GetInventoryDocumentInputSchema.parse({ documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch(":documentId")
  @RequirePermission("inventory.documents.manage")
  async updateDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/confirm")
  @RequirePermission("inventory.documents.manage")
  async confirmDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = ConfirmInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.confirmDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/post")
  @RequirePermission("inventory.documents.post")
  async postDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = PostInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.postDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/cancel")
  @RequirePermission("inventory.documents.manage")
  async cancelDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CancelInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.cancelDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
