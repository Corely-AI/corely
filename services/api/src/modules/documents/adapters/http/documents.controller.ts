import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { isErr } from "@corely/kernel";
import {
  CompleteUploadInputSchema,
  CreateUploadIntentInputSchema,
  GetDownloadUrlInputSchema,
  LinkDocumentInputSchema,
  ListLinkedDocumentsInputSchema,
  UnlinkDocumentInputSchema,
  UploadFileBase64InputSchema,
} from "@corely/contracts";
import { DocumentsApplication } from "../../application/documents.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";

@Controller("documents")
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly app: DocumentsApplication) {}

  @Post("upload-intent")
  async createUploadIntent(@Body() body: unknown, @Req() req: Request) {
    const input = CreateUploadIntentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createUploadIntent.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/files/:fileId/complete")
  async completeUpload(
    @Param("documentId") documentId: string,
    @Param("fileId") fileId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CompleteUploadInputSchema.parse({ ...(body as object), documentId, fileId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.completeUpload.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":documentId/files/:fileId/download-url")
  async getDownloadUrlWithFile(
    @Param("documentId") documentId: string,
    @Param("fileId") fileId: string,
    @Req() req: Request
  ) {
    const input = GetDownloadUrlInputSchema.parse({ documentId, fileId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDownloadUrl.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":documentId/download-url")
  async getDownloadUrl(@Param("documentId") documentId: string, @Req() req: Request) {
    const input = GetDownloadUrlInputSchema.parse({ documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDownloadUrl.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/link")
  async linkDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = LinkDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.linkDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post(":documentId/unlink")
  async unlinkDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UnlinkDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.unlinkDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("by-entity")
  async listByEntity(@Req() req: Request) {
    const input = ListLinkedDocumentsInputSchema.parse(req.query);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listLinkedDocuments.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("upload-base64")
  async uploadBase64(@Body() body: unknown, @Req() req: Request) {
    const input = UploadFileBase64InputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.uploadFile.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get(":documentId/files/:fileId/download")
  async getDownload(
    @Param("documentId") documentId: string,
    @Param("fileId") fileId: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const input = GetDownloadUrlInputSchema.parse({ documentId, fileId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.proxyDownload.execute(input, ctx);
    if (isErr(result)) {
      return mapResultToHttp(result);
    }
    const { buffer, filename, contentType } = result.value;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  }
}
