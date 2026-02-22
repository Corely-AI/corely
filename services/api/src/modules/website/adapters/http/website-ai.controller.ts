import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  GenerateWebsitePageInputSchema,
  GenerateWebsitePageOutputSchema,
  GenerateWebsiteBlocksInputSchema,
  GenerateWebsiteBlocksOutputSchema,
  RegenerateWebsiteBlockInputSchema,
  RegenerateWebsiteBlockOutputSchema,
} from "@corely/contracts";
import {
  buildUseCaseContext,
  mapResultToHttp,
  resolveIdempotencyKey,
} from "@/shared/http/usecase-mappers";
import { AuthGuard } from "@/modules/identity";
import { WebsiteApplication } from "../../application/website.application";

@Controller("website/ai")
@UseGuards(AuthGuard)
export class WebsiteAiController {
  constructor(private readonly app: WebsiteApplication) {}

  @Post("generate-page")
  async generate(@Body() body: unknown, @Req() req: Request) {
    const input = GenerateWebsitePageInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const idempotencyKey = resolveIdempotencyKey(req) ?? input.idempotencyKey;
    const result = await this.app.generatePageFromPrompt.execute({ ...input, idempotencyKey }, ctx);
    return GenerateWebsitePageOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("generate-blocks")
  async generateBlocks(@Body() body: unknown, @Req() req: Request) {
    const input = GenerateWebsiteBlocksInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.generateBlocks.execute(input, ctx);
    return GenerateWebsiteBlocksOutputSchema.parse(mapResultToHttp(result));
  }

  @Post("regenerate-block")
  async regenerateBlock(@Body() body: unknown, @Req() req: Request) {
    const input = RegenerateWebsiteBlockInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.regenerateBlock.execute(input, ctx);
    return RegenerateWebsiteBlockOutputSchema.parse(mapResultToHttp(result));
  }
}
