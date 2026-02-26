import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  type InventoryDocumentDto,
  RequestInventoryPostApprovalInputSchema,
  CreateInventoryDocumentInputSchema,
  UpdateInventoryDocumentInputSchema,
  GetInventoryDocumentInputSchema,
  ListInventoryDocumentsInputSchema,
  ConfirmInventoryDocumentInputSchema,
  PostInventoryDocumentInputSchema,
  CancelInventoryDocumentInputSchema,
} from "@corely/contracts";
import { ValidationError } from "@corely/kernel";
import { InventoryDocumentsApplication } from "../../application/inventory-documents.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";
import { ApprovalGateService } from "../../../approvals/application/approval-gate.service";

const INVENTORY_POST_APPROVAL_ACTION_KEY = "approval.inventory.document.post";
type PostApprovalResult = {
  status: "APPROVED" | "PENDING" | "REJECTED";
  reason?: string;
  instanceId?: string;
  policyId?: string;
};

@Controller("inventory/documents")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("inventory.basic")
export class InventoryDocumentsController {
  constructor(
    private readonly app: InventoryDocumentsApplication,
    private readonly approvalGate: ApprovalGateService
  ) {}

  @Get()
  @RequirePermission("inventory.documents.read")
  async listDocuments(@Query() query: Record<string, string | undefined>, @Req() req: Request) {
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
    const idempotencyKey = resolveIdempotencyHeader(req);
    const input = PostInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const approvalInput: {
      documentId: string;
      postingDate?: string;
      idempotencyKey?: string;
    } = {
      documentId: input.documentId,
      postingDate: input.postingDate,
      idempotencyKey: input.idempotencyKey ?? idempotencyKey,
    };
    const ctx = buildUseCaseContext(req);
    const approval = await this.requestPostApprovalInternal(approvalInput, ctx);
    if (approval.status === "PENDING") {
      throw toHttpException(
        new ValidationError(
          "Inventory document posting requires approval and is currently pending",
          { instanceId: approval.instanceId, policyId: approval.policyId },
          "INVENTORY_POST_APPROVAL_PENDING"
        )
      );
    }
    if (approval.status === "REJECTED") {
      throw toHttpException(
        new ValidationError(
          "Inventory document posting approval was rejected",
          { reason: approval.reason, instanceId: approval.instanceId, policyId: approval.policyId },
          "INVENTORY_POST_APPROVAL_REJECTED"
        )
      );
    }
    const result = await this.app.postDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/request-post-approval")
  @RequirePermission("inventory.documents.post")
  async requestPostApproval(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const idempotencyKey = resolveIdempotencyHeader(req);
    const input = RequestInventoryPostApprovalInputSchema.parse({
      ...(body as object),
      documentId,
    });
    const requestInput: {
      documentId: string;
      postingDate?: string;
      idempotencyKey?: string;
    } = {
      documentId: input.documentId,
      postingDate: input.postingDate,
      idempotencyKey: input.idempotencyKey ?? idempotencyKey,
    };
    const ctx = buildUseCaseContext(req);
    return this.requestPostApprovalInternal(requestInput, ctx);
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

  private async requestPostApprovalInternal(
    input: { documentId: string; postingDate?: string; idempotencyKey?: string },
    ctx: ReturnType<typeof buildUseCaseContext>
  ): Promise<PostApprovalResult> {
    if (!ctx.tenantId || !ctx.userId) {
      throw toHttpException(new ValidationError("tenantId and userId are required"));
    }

    const documentResult = await this.app.getDocument.execute(
      { documentId: input.documentId },
      ctx
    );
    const document = mapResultToHttp(documentResult).document;

    if (document.status === "POSTED") {
      return { status: "APPROVED", reason: "already_posted" };
    }
    if (document.status === "CANCELED") {
      return { status: "REJECTED", reason: "document_canceled" };
    }
    if (document.status !== "CONFIRMED") {
      return { status: "REJECTED", reason: "document_not_confirmed" };
    }

    const idempotencyKey =
      input.idempotencyKey ?? this.buildDeterministicApprovalKey(document, input);
    const payload = this.buildApprovalPayload(document, input.postingDate);
    const gateResult = await this.approvalGate.requireApproval({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      actionKey: INVENTORY_POST_APPROVAL_ACTION_KEY,
      entityType: "InventoryDocument",
      entityId: input.documentId,
      payload,
      idempotencyKey,
    });

    return gateResult;
  }

  private buildDeterministicApprovalKey(
    document: InventoryDocumentDto,
    input: { postingDate?: string; idempotencyKey?: string }
  ): string {
    const postingDate = input.postingDate ?? document.postingDate ?? "none";
    return `inventory-post-approval:${document.id}:${postingDate}`;
  }

  private buildApprovalPayload(
    document: InventoryDocumentDto,
    postingDate?: string
  ): Record<string, unknown> {
    const totalQuantity = document.lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
    return {
      documentId: document.id,
      documentType: document.documentType,
      status: document.status,
      postingDate: postingDate ?? document.postingDate ?? null,
      lineCount: document.lines.length,
      totalQuantity,
      sourceType: document.sourceType ?? null,
      sourceId: document.sourceId ?? null,
    };
  }
}

const resolveIdempotencyHeader = (req: Request): string | undefined => {
  const raw = req.headers?.["idempotency-key"] ?? req.headers?.["x-idempotency-key"];
  if (Array.isArray(raw)) {
    return raw.find((value) => typeof value === "string" && value.length > 0);
  }
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
};
