import { Injectable, Logger } from "@nestjs/common";
import type { EnvService } from "@corely/config";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { LanguageModelPort } from "../../application/ports/language-model.port";
import type { DomainToolPort } from "../../application/ports/domain-tool.port";
import { buildAiTools } from "../tools/tools.factory";
import type { ToolExecutionRepositoryPort } from "../../application/ports/tool-execution-repository.port";
import type { AuditPort } from "../../application/ports/audit.port";
import type { OutboxPort } from "../../application/ports/outbox.port";
import { collectInputsTool } from "../tools/interactive-tools";
import { type CopilotUIMessage } from "../../domain/types/ui-message";
import { type ObservabilityPort, type ObservabilitySpanRef } from "@corely/kernel";
import { type LanguageModelUsage, type StreamTextResult } from "ai";

@Injectable()
export class AiSdkModelAdapter implements LanguageModelPort {
  private readonly openai: ReturnType<typeof createOpenAI>;
  private readonly anthropic: ReturnType<typeof createAnthropic>;
  private readonly logger = new Logger(AiSdkModelAdapter.name);

  constructor(
    private readonly toolExecutions: ToolExecutionRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort,
    private readonly env: EnvService,
    private readonly observability: ObservabilityPort
  ) {
    this.openai = createOpenAI({
      apiKey: this.env.OPENAI_API_KEY || "",
    });
    this.anthropic = createAnthropic({
      apiKey: this.env.ANTHROPIC_API_KEY || "",
    });
  }

  async streamChat(params: {
    messages: CopilotUIMessage[];
    tools: DomainToolPort[];
    runId: string;
    tenantId: string;
    userId: string;
    observability: ObservabilitySpanRef;
  }): Promise<{ result: StreamTextResult<any, any>; usage?: LanguageModelUsage }> {
    const aiTools = buildAiTools(params.tools, {
      toolExecutions: this.toolExecutions,
      audit: this.audit,
      outbox: this.outbox,
      tenantId: params.tenantId,
      runId: params.runId,
      userId: params.userId,
      observability: this.observability,
      parentSpan: params.observability,
    });

    const provider = this.env.AI_MODEL_PROVIDER;
    const modelId = this.env.AI_MODEL_ID;

    const model = provider === "anthropic" ? this.anthropic(modelId) : this.openai(modelId);

    const toolset = {
      ...aiTools,
      collect_inputs: collectInputsTool,
    };

    this.logger.debug(`Starting streamText with ${Object.keys(toolset).length} tools`);

    const modelMessages = await convertToModelMessages(
      params.messages.map((msg) => ({
        role: msg.role,
        parts: msg.parts,
      }))
    );

    const result = streamText({
      model,
      messages: modelMessages,
      tools: toolset,
      stopWhen: stepCountIs(5),
    });

    let usage: LanguageModelUsage | undefined;
    try {
      usage = await result.usage;
    } catch (err) {
      this.logger.warn(`Failed to resolve usage: ${err}`);
    }

    return { result, usage };
  }
}
