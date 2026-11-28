import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { ProceduresUseCase } from "../../application/procedures.usecase";

@Controller("knowledge")
@UseGuards(AuthGuard)
export class ProceduresController {
  constructor(@Inject(ProceduresUseCase) private readonly procedures: ProceduresUseCase) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Req() req: ContextAwareRequest) {
    return this.procedures.list(toUseCaseContext(req));
  }

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  detail(@Param("id", ParseUUIDPipe) id: string, @Req() req: ContextAwareRequest) {
    return this.procedures.detail(id, toUseCaseContext(req));
  }

  @Get(":id/files/:fileId")
  @Header("Cache-Control", "private, no-store")
  async file(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("fileId", ParseUUIDPipe) fileId: string,
    @Req() req: ContextAwareRequest,
    @Res() res: Response
  ) {
    const file = await this.procedures.download(id, fileId, toUseCaseContext(req));
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(file.filename).replace(/'/g, "%27")}`
    );
    return res.send(file.bytes);
  }

  @Post()
  @Header("Cache-Control", "private, no-store")
  create(@Body() input: unknown, @Req() req: ContextAwareRequest) {
    return this.command("create", undefined, input, req);
  }

  @Patch(":id")
  @Header("Cache-Control", "private, no-store")
  edit(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: unknown,
    @Req() req: ContextAwareRequest
  ) {
    return this.command("edit", id, input, req);
  }

  @Post(":id/publish")
  @Header("Cache-Control", "private, no-store")
  publish(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: unknown,
    @Req() req: ContextAwareRequest
  ) {
    return this.command("publish", id, input, req);
  }

  @Post(":id/archive")
  @Header("Cache-Control", "private, no-store")
  archive(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() input: unknown,
    @Req() req: ContextAwareRequest
  ) {
    return this.command("archive", id, input, req);
  }

  private async command(
    kind: "create" | "edit" | "publish" | "archive",
    id: string | undefined,
    body: unknown,
    req: ContextAwareRequest
  ) {
    try {
      return await this.procedures.command(
        kind,
        id,
        body,
        resolveIdempotencyKey(req),
        toUseCaseContext(req)
      );
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException("Invalid procedure input");
      }
      throw error;
    }
  }
}
