import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
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
import { TaskContextUseCase } from "../../application/task-context.usecase";

@Controller("tasks")
@UseGuards(AuthGuard)
export class TaskContextController {
  constructor(private readonly taskContext: TaskContextUseCase) {}

  @Get(":taskId/context")
  @Header("Cache-Control", "private, no-store")
  get(@Param("taskId") taskId: string, @Req() req: ContextAwareRequest) {
    return this.taskContext.get(taskId, toUseCaseContext(req));
  }

  @Post(":taskId/context/comments")
  @Header("Cache-Control", "private, no-store")
  comment(@Param("taskId") taskId: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.taskContext.addComment(taskId, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }

  @Post(":taskId/context/sources")
  @Header("Cache-Control", "private, no-store")
  link(@Param("taskId") taskId: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.taskContext.addSource(taskId, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }

  @Post(":taskId/context/files")
  @Header("Cache-Control", "private, no-store")
  upload(@Param("taskId") taskId: string, @Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.taskContext.upload(taskId, body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }

  @Post("follow-up")
  @Header("Cache-Control", "private, no-store")
  followUp(@Body() body: unknown, @Req() req: ContextAwareRequest) {
    return this.parse(() =>
      this.taskContext.createFollowUp(body, resolveIdempotencyKey(req), toUseCaseContext(req))
    );
  }

  @Get(":taskId/context/files/:documentId")
  @Header("Cache-Control", "private, no-store")
  async download(
    @Param("taskId") taskId: string,
    @Param("documentId") documentId: string,
    @Req() req: ContextAwareRequest,
    @Res() res: Response
  ) {
    const { bytes, file } = await this.taskContext.download(
      taskId,
      documentId,
      toUseCaseContext(req)
    );
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.attachment(file.filename);
    res.setHeader("Content-Type", "application/octet-stream");
    return res.send(bytes);
  }

  private async parse<T>(action: () => Promise<T>) {
    try {
      return await action();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException("Invalid task context request");
      }
      throw error;
    }
  }
}
