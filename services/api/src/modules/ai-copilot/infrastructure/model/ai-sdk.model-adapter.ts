import { Injectable } from "@nestjs/common";
import { streamText, convertToCoreMessages, pipeUIMessageStreamToResponse } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { LanguageModelPort } from "../../application/ports/language-model.port";
import { DomainToolPort } from "../../application/ports/domain-tool.port";
import { buildAiTools } from "../tools/tools.factory";
import { ToolExecutionRepositoryPort } from "../../application/ports/tool-execution.repo.port";
import { AuditPort } from "../../application/ports/audit.port";
import { OutboxPort } from "../../application/ports/outbox.port";

@Injectable()
export class AiSdkModelAdapter implements LanguageModelPort {
  private readonly openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
  });

  constructor(
    private readonly toolExecutions: ToolExecutionRepositoryPort,
    private readonly audit: AuditPort,
    private readonly outbox: OutboxPort
  ) {}

  async streamChat(params: {
    messages: any[];
    tools: DomainToolPort[];
    runId: string;
    tenantId: string;
    userId: string;
    response: any;
  }): Promise<void> {
    const aiTools = buildAiTools(params.tools, {
      toolExecutions: this.toolExecutions,
      audit: this.audit,
      outbox: this.outbox,
      tenantId: params.tenantId,
      runId: params.runId,
      userId: params.userId,
    });

    const result = await streamText({
      model: this.openai("gpt-4o-mini"),
      messages: convertToCoreMessages(params.messages),
      tools: aiTools,
    });

    pipeUIMessageStreamToResponse(result, params.response);
  }
}
