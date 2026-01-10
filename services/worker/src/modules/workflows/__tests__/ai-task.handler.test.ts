import { describe, expect, it } from "vitest";
import { AiTaskHandler } from "../handlers/ai-task.handler";
import { PromptRegistry, StaticPromptProvider, promptDefinitions } from "@corely/prompts";
import type { EnvService } from "@corely/config";
import { PromptUsageLogger } from "../../../shared/prompts/prompt-usage.logger";

describe("AiTaskHandler", () => {
  it("emits suggested events when direct emit is disabled", async () => {
    const promptRegistry = new PromptRegistry([new StaticPromptProvider(promptDefinitions)]);
    const env = { APP_ENV: "test" } as EnvService;
    const promptLogger = new PromptUsageLogger();
    const handler = new AiTaskHandler(promptRegistry, env, promptLogger);
    const result = await handler.execute(
      {
        id: "task-1",
        tenantId: "tenant-1",
        instanceId: "instance-1",
        type: "AI",
        input: {
          promptId: "workflow.ai_task.freeform",
          promptVars: { PROMPT: "Decide" },
          policy: {
            allowedEvents: ["APPROVE"],
            allowDirectEmit: false,
          },
        },
      },
      {
        clock: { now: () => new Date() },
        http: { request: async () => ({ status: 200 }) },
        email: { send: async () => ({ messageId: "email" }) },
        llm: {
          complete: async () => ({ output: "ok", decisionEvent: "APPROVE" }),
        },
      }
    );

    expect(result.status).toBe("SUCCEEDED");
    expect(result.emittedEvent).toBeUndefined();
    expect(result.suggestedEvent).toBe("APPROVE");
    expect(result.output?.promptId).toBe("workflow.ai_task.freeform");
    expect(result.output?.response).toBe("ok");
  });

  it("emits events when allowlisted and direct emit is enabled", async () => {
    const promptRegistry = new PromptRegistry([new StaticPromptProvider(promptDefinitions)]);
    const env = { APP_ENV: "test" } as EnvService;
    const promptLogger = new PromptUsageLogger();
    const handler = new AiTaskHandler(promptRegistry, env, promptLogger);
    const result = await handler.execute(
      {
        id: "task-2",
        tenantId: "tenant-1",
        instanceId: "instance-1",
        type: "AI",
        input: {
          promptId: "workflow.ai_task.freeform",
          promptVars: { PROMPT: "Decide" },
          policy: {
            allowedEvents: ["REJECT"],
            allowDirectEmit: true,
          },
        },
      },
      {
        clock: { now: () => new Date() },
        http: { request: async () => ({ status: 200 }) },
        email: { send: async () => ({ messageId: "email" }) },
        llm: {
          complete: async () => ({ output: "no", decisionEvent: "REJECT" }),
        },
      }
    );

    expect(result.emittedEvent).toBe("REJECT");
    expect(result.suggestedEvent).toBeUndefined();
  });
});
