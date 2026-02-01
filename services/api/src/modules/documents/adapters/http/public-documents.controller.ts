import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { GetPublicFileUrlInputSchema } from "@corely/contracts";
import { DocumentsApplication } from "../../application/documents.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";

@Controller("public/documents")
export class PublicDocumentsController {
  constructor(private readonly app: DocumentsApplication) {}

  @Get("files/:fileId")
  async getPublicFile(@Param("fileId") fileId: string, @Req() req: Request, @Res() res: Response) {
    const input = GetPublicFileUrlInputSchema.parse({ fileId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getPublicFileUrl.execute(input, ctx);
    const payload = mapResultToHttp(result);
    return res.redirect(payload.url);
  }
}
