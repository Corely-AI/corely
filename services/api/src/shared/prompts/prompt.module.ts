import { Module } from "@nestjs/common";
import {
  PromptRegistry,
  StaticPromptProvider,
  InMemoryPromptOverrideProvider,
  promptDefinitions,
} from "@corely/prompts";
import { PromptUsageLogger } from "./prompt-usage.logger";

@Module({
  providers: [
    PromptUsageLogger,
    {
      provide: PromptRegistry,
      useFactory: () =>
        new PromptRegistry([
          new InMemoryPromptOverrideProvider([]),
          new StaticPromptProvider(promptDefinitions),
        ]),
    },
  ],
  exports: [PromptRegistry, PromptUsageLogger],
})
export class PromptModule {}
