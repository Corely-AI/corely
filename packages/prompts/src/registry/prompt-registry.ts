import {
  type PromptContext,
  type PromptDefinition,
  type PromptProviderPort,
  type PromptResolvedDefinition,
  type PromptRenderResult,
  type PromptSelectionRule,
} from "../types";
import { hashPromptTemplate } from "../utils/hash";
import { renderPrompt } from "../utils/render";

export class PromptRegistry {
  constructor(private readonly providers: PromptProviderPort[]) {
    if (!providers.length) {
      throw new Error("PromptRegistry requires at least one provider");
    }
  }

  get(promptId: string, context: PromptContext): PromptResolvedDefinition {
    const definition = this.findDefinition(promptId, context);
    const version = this.selectVersion(definition, context);
    const promptHash = hashPromptTemplate(version.template, version.version);
    return { definition, version, promptHash };
  }

  render(
    promptId: string,
    context: PromptContext,
    variables: Record<string, unknown> = {}
  ): PromptRenderResult {
    const resolved = this.get(promptId, context);
    const rendered = renderPrompt(promptId, resolved.version, variables);
    return {
      ...rendered,
      promptHash: resolved.promptHash,
    };
  }

  list(context?: PromptContext): PromptDefinition[] {
    const seen = new Map<string, PromptDefinition>();
    for (const provider of this.providers) {
      if (!provider.list) {
        continue;
      }
      const definitions = provider.list(context);
      for (const def of definitions) {
        if (!seen.has(def.id)) {
          seen.set(def.id, def);
        }
      }
    }
    return Array.from(seen.values());
  }

  private findDefinition(promptId: string, context: PromptContext): PromptDefinition {
    for (const provider of this.providers) {
      const definition = provider.get(promptId, context);
      if (definition) {
        return definition;
      }
    }
    throw new Error(`Prompt not found: ${promptId}`);
  }

  private selectVersion(definition: PromptDefinition, context: PromptContext) {
    const rules = definition.selection ?? [];
    const matches = rules.filter((rule) => this.matches(rule, context));
    if (matches.length > 0) {
      const sorted = matches.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      const versionId = sorted[0].version;
      const version = definition.versions.find((item) => item.version === versionId);
      if (!version) {
        throw new Error(
          `Prompt ${definition.id} references missing version ${versionId} in selection rules`
        );
      }
      return version;
    }

    const fallback = definition.versions.find((item) => item.version === definition.defaultVersion);
    if (!fallback) {
      throw new Error(
        `Prompt ${definition.id} default version ${definition.defaultVersion} not found`
      );
    }
    return fallback;
  }

  private matches(rule: PromptSelectionRule, context: PromptContext): boolean {
    const envMatches =
      !rule.when.environments || rule.when.environments.includes(context.environment);
    const workspaceMatches =
      !rule.when.workspaceKinds ||
      (context.workspaceKind ? rule.when.workspaceKinds.includes(context.workspaceKind) : false);
    const tenantMatches =
      !rule.when.tenantIds ||
      (context.tenantId ? rule.when.tenantIds.includes(context.tenantId) : false);
    return envMatches && workspaceMatches && tenantMatches;
  }
}
