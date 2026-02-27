import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ok,
  err,
  RequireTenant,
} from "@corely/kernel";
import {
  type GenerateWebsiteBlocksInput,
  type GenerateWebsiteBlocksOutput,
  WebsitePageContentSchema,
} from "@corely/contracts";
import { buildDefaultWebsitePageContent } from "../../domain/page-content";

type Deps = {
  logger: LoggerPort;
};

const applyBriefHeuristics = (
  blocks: GenerateWebsiteBlocksInput["existingBlocks"] extends infer T
    ? T extends Array<infer U>
      ? U[]
      : never
    : never,
  brief: string,
  lockedIds: Set<string>
) => {
  const normalized = brief.toLowerCase();

  return blocks.map((block) => {
    if (lockedIds.has(block.id)) {
      return block;
    }

    if (block.type === "schedule") {
      if (normalized.includes("no schedule") || normalized.includes("without schedule")) {
        return { ...block, enabled: false };
      }
      if (normalized.includes("show schedule") || normalized.includes("enable schedule")) {
        return { ...block, enabled: true };
      }
    }

    if (block.type === "leadForm") {
      if (normalized.includes("no lead form") || normalized.includes("without lead form")) {
        return { ...block, enabled: false };
      }
      if (normalized.includes("show lead form") || normalized.includes("enable lead form")) {
        return { ...block, enabled: true };
      }
    }

    return block;
  });
};

@RequireTenant()
export class GenerateWebsiteBlocksUseCase extends BaseUseCase<
  GenerateWebsiteBlocksInput,
  GenerateWebsiteBlocksOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: GenerateWebsiteBlocksInput,
    _ctx: UseCaseContext
  ): Promise<Result<GenerateWebsiteBlocksOutput, UseCaseError>> {
    const defaults = buildDefaultWebsitePageContent(input.templateKey);

    const baseBlocks = input.existingBlocks?.length ? input.existingBlocks : defaults.blocks;
    const lockedIds = new Set(input.lockedBlockIds ?? []);
    const blocks = applyBriefHeuristics(baseBlocks, input.brief, lockedIds);

    const parsed = WebsitePageContentSchema.safeParse({
      templateKey: input.templateKey,
      templateVersion: defaults.templateVersion,
      blocks,
    });

    if (!parsed.success) {
      return err(
        new ValidationError(
          "Generated blocks are invalid",
          parsed.error.flatten(),
          "Website:InvalidGeneratedBlocks"
        )
      );
    }

    return ok({ content: parsed.data });
  }
}
