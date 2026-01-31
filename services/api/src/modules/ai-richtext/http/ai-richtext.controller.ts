import { Body, Controller, Post, Req, Res, UseGuards, Header } from "@nestjs/common";
import type { Request, Response } from "express";
import { RichTextAiRequestSchema } from "@corely/contracts";
import { AuthGuard } from "../../identity";
import { RunRichTextAiUseCase } from "../application/run-richtext-ai.usecase";

@Controller("ai/richtext")
@UseGuards(AuthGuard)
export class AiRichTextController {
  constructor(private readonly useCase: RunRichTextAiUseCase) {}

  @Post()
  async generateBlocking(@Body() body: unknown) {
    const request = RichTextAiRequestSchema.parse(body);
    return this.useCase.executeBlocking(request);
  }

  @Post("stream")
  @Header("x-vercel-ai-ui-message-stream", "v1")
  async generateStream(@Body() body: unknown, @Res() res: Response) {
    const request = RichTextAiRequestSchema.parse(body);
    const result = await this.useCase.executeStream(request);

    // Newer AI SDK uses pipeDataStreamToResponse or similar.
    // If lint fails on pipeDataStreamToResponse, we try pipeTextStreamToResponse
    return result.pipeTextStreamToResponse(res);
  }
}
