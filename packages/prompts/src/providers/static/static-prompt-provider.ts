import { type PromptContext, type PromptDefinition, type PromptProviderPort } from "../../types";

export class StaticPromptProvider implements PromptProviderPort {
  private readonly definitions = new Map<string, PromptDefinition>();

  constructor(definitions: PromptDefinition[]) {
    for (const def of definitions) {
      this.definitions.set(def.id, def);
    }
  }

  get(id: string, _context: PromptContext): PromptDefinition | undefined {
    return this.definitions.get(id);
  }

  list(): PromptDefinition[] {
    return Array.from(this.definitions.values());
  }
}
