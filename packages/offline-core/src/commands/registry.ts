import { z } from "zod";
import { CommandDefinition } from "./command";

export class CommandRegistry {
  private readonly definitions = new Map<string, CommandDefinition>();

  register<TPayload>(definition: CommandDefinition<TPayload>): void {
    if (this.definitions.has(definition.type)) {
      throw new Error(`Command type already registered: ${definition.type}`);
    }
    this.definitions.set(definition.type, definition);
  }

  get(type: string): CommandDefinition | undefined {
    return this.definitions.get(type);
  }

  validate<TPayload>(type: string, payload: unknown): TPayload {
    const definition = this.definitions.get(type);
    if (!definition) {
      throw new Error(`Unknown command type: ${type}`);
    }
    const parsed = (definition.schema as z.ZodType<TPayload>).parse(payload);
    return definition.normalize ? definition.normalize(parsed) : parsed;
  }

  list(): CommandDefinition[] {
    return Array.from(this.definitions.values());
  }
}
