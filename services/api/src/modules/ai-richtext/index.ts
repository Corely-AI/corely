import { Module } from "@nestjs/common";
import { AiRichTextController } from "./http/ai-richtext.controller";
import { RunRichTextAiUseCase } from "./application/run-richtext-ai.usecase";
import { IdentityModule } from "../identity";

@Module({
  imports: [IdentityModule],
  controllers: [AiRichTextController],
  providers: [RunRichTextAiUseCase],
  exports: [RunRichTextAiUseCase],
})
export class AiRichTextModule {}
