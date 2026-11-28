import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { toUseCaseContext, type ContextAwareRequest } from "../../../../shared/request-context";
import { resolveIdempotencyKey } from "../../../../shared/http/usecase-mappers";
import { StaffAbsenceUseCase } from "../../application/staff-absence.usecase";
@Controller("people/staff/:staffId")
@UseGuards(AuthGuard)
export class StaffAbsenceController {
  constructor(@Inject(StaffAbsenceUseCase) private readonly absences: StaffAbsenceUseCase) {}
  @Get("unavailability")
  @Header("Cache-Control", "private, no-store")
  neutral(
    @Param("staffId") staffId: string,
    @Query() query: unknown,
    @Req() req: ContextAwareRequest
  ) {
    return this.parse(() => this.absences.neutral(staffId, query, toUseCaseContext(req)));
  }
  @Get("absences")
  @Header("Cache-Control", "private, no-store")
  list(@Param("staffId") staffId: string, @Req() req: ContextAwareRequest) {
    return this.absences.list(staffId, toUseCaseContext(req));
  }
  @Post("absences")
  @Header("Cache-Control", "private, no-store")
  record(
    @Param("staffId") staffId: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    return this.parse(() =>
      this.absences.command(
        "record",
        staffId,
        null,
        body,
        resolveIdempotencyKey(req),
        toUseCaseContext(req)
      )
    );
  }
  @Patch("absences/:id")
  @Header("Cache-Control", "private, no-store")
  correct(
    @Param("staffId") staffId: string,
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    return this.parse(() =>
      this.absences.command(
        "correct",
        staffId,
        id,
        body,
        resolveIdempotencyKey(req),
        toUseCaseContext(req)
      )
    );
  }
  @Post("absences/:id/cancel")
  @Header("Cache-Control", "private, no-store")
  cancel(
    @Param("staffId") staffId: string,
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    return this.parse(() =>
      this.absences.command(
        "cancel",
        staffId,
        id,
        body,
        resolveIdempotencyKey(req),
        toUseCaseContext(req)
      )
    );
  }
  @Get("absences/:id/attachments")
  @Header("Cache-Control", "private, no-store")
  attachments(
    @Param("staffId") staffId: string,
    @Param("id") id: string,
    @Req() req: ContextAwareRequest
  ) {
    return this.absences.attachments(staffId, id, toUseCaseContext(req));
  }
  @Post("absences/:id/attachments")
  @Header("Cache-Control", "private, no-store")
  upload(
    @Param("staffId") staffId: string,
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: ContextAwareRequest
  ) {
    return this.parse(() =>
      this.absences.upload(staffId, id, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }
  @Get("absences/:id/attachments/:documentId/download")
  @Header("Cache-Control", "private, no-store")
  async download(
    @Param("staffId") staffId: string,
    @Param("id") id: string,
    @Param("documentId") documentId: string,
    @Req() req: ContextAwareRequest,
    @Res() res: Response
  ) {
    const { bytes, attachment } = await this.absences.download(
      staffId,
      id,
      documentId,
      toUseCaseContext(req)
    );
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename).replace(/'/g, "%27")}`
    );
    return res.send(bytes);
  }
  private async parse<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException("Invalid absence request");
      }
      throw error;
    }
  }
}
