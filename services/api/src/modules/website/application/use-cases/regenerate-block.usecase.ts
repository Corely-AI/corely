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
  type RegenerateWebsiteBlockInput,
  type RegenerateWebsiteBlockOutput,
  WebsiteBlockUnionSchema,
} from "@corely/contracts";

type Deps = {
  logger: LoggerPort;
};

const resolveUpdatedEnabled = (
  instruction: string,
  currentEnabled: boolean | undefined
): boolean => {
  const normalized = instruction.toLowerCase();
  if (normalized.includes("disable") || normalized.includes("hide")) {
    return false;
  }
  if (normalized.includes("enable") || normalized.includes("show")) {
    return true;
  }
  return currentEnabled ?? true;
};

@RequireTenant()
export class RegenerateWebsiteBlockUseCase extends BaseUseCase<
  RegenerateWebsiteBlockInput,
  RegenerateWebsiteBlockOutput
> {
  constructor(protected readonly deps: Deps) {
    super({ logger: deps.logger });
  }

  protected async handle(
    input: RegenerateWebsiteBlockInput,
    _ctx: UseCaseContext
  ): Promise<Result<RegenerateWebsiteBlockOutput, UseCaseError>> {
    if (input.blockType !== input.currentBlock.type) {
      return err(
        new ValidationError(
          "blockType must match currentBlock.type",
          undefined,
          "Website:BlockTypeMismatch"
        )
      );
    }

    const nextBlock = {
      ...input.currentBlock,
      enabled: resolveUpdatedEnabled(input.instruction, input.currentBlock.enabled),
    };

    const parsed = WebsiteBlockUnionSchema.safeParse(nextBlock);
    if (!parsed.success) {
      return err(
        new ValidationError(
          "Regenerated block is invalid",
          parsed.error.flatten(),
          "Website:InvalidRegeneratedBlock"
        )
      );
    }

    return ok({ block: parsed.data });
  }
}
