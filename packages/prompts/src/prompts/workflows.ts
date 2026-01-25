import { z } from "zod";
import { type PromptDefinition } from "../types";

export const workflowPrompts: PromptDefinition[] = [
  {
    id: "workflow.ai_task.freeform",
    description: "Fallback prompt wrapper for workflow AI tasks.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "{{{PROMPT}}}",
        variablesSchema: z.object({
          PROMPT: z.string().min(1),
        }),
        variables: [{ key: "PROMPT", kind: "block" }],
      },
    ],
    tags: ["workflow", "ai"],
  },
];
