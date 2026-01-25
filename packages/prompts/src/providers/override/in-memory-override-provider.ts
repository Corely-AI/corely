import { type PromptContext, type PromptDefinition, type PromptProviderPort } from "../../types";

export interface PromptOverrideEntry {
  promptId: string;
  tenantId?: string;
  definition: PromptDefinition;
}

export class InMemoryPromptOverrideProvider implements PromptProviderPort {
  constructor(private readonly overrides: PromptOverrideEntry[]) {}

  get(id: string, context: PromptContext): PromptDefinition | undefined {
    const matches = this.overrides.filter((entry) => entry.promptId === id);
    if (!matches.length) {
      return undefined;
    }

    const tenantMatch = matches.find(
      (entry) => entry.tenantId && entry.tenantId === context.tenantId
    );
    if (tenantMatch) {
      return tenantMatch.definition;
    }

    const globalMatch = matches.find((entry) => !entry.tenantId);
    return globalMatch?.definition;
  }
}
