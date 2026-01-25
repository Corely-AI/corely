import { Injectable } from "@nestjs/common";
import type { TaskHandler, TaskHandlerResult, WorkflowTaskPayload } from "./task-handler.interface";
import type { WorkflowPorts } from "../ports/workflow-ports";
import { PromptRegistry } from "@corely/prompts";
import { EnvService } from "@corely/config";
import { PromptUsageLogger } from "../../../shared/prompts/prompt-usage.logger";

interface AiTaskPolicy {
  allowedEvents?: string[];
  allowDirectEmit?: boolean;
}

@Injectable()
export class AiTaskHandler implements TaskHandler {
  constructor(
    private readonly promptRegistry: PromptRegistry,
    private readonly env: EnvService,
    private readonly promptUsageLogger: PromptUsageLogger
  ) {}

  canHandle(type: string): boolean {
    return type === "AI";
  }

  async execute(task: WorkflowTaskPayload, ports: WorkflowPorts): Promise<TaskHandlerResult> {
    const input = task.input ?? {};
    const policy = (input.policy as AiTaskPolicy) ?? {};
    const allowedEvents = policy.allowedEvents ?? [];
    const promptId =
      typeof input.promptId === "string" && input.promptId.trim().length > 0
        ? input.promptId
        : "workflow.ai_task.freeform";
    const variables = (input.promptVars as Record<string, unknown> | undefined) ?? {
      PROMPT: String(input.prompt ?? ""),
    };
    const prompt = this.promptRegistry.render(
      promptId,
      {
        environment: this.env.APP_ENV,
        tenantId: task.tenantId,
      },
      variables
    );
    this.promptUsageLogger.logUsage({
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      promptHash: prompt.promptHash,
      modelId: input.model as string | undefined,
      tenantId: task.tenantId,
      taskId: task.id,
      instanceId: task.instanceId,
      purpose: "workflow.ai_task",
    });

    const response = await ports.llm.complete({
      prompt: prompt.content,
      model: input.model as string | undefined,
      temperature: typeof input.temperature === "number" ? input.temperature : undefined,
      metadata: {
        tenantId: task.tenantId,
        instanceId: task.instanceId,
        taskId: task.id,
      },
    });

    const decisionEvent = response.decisionEvent;
    const canEmit =
      policy.allowDirectEmit === true && !!decisionEvent && allowedEvents.includes(decisionEvent);

    return {
      status: "SUCCEEDED",
      output: {
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        promptHash: prompt.promptHash,
        response: response.output,
        decisionEvent: decisionEvent ?? null,
        policy: {
          allowedEvents,
          allowDirectEmit: policy.allowDirectEmit ?? false,
        },
      },
      emittedEvent: canEmit ? decisionEvent : undefined,
      suggestedEvent: !canEmit && decisionEvent ? decisionEvent : undefined,
    };
  }
}
