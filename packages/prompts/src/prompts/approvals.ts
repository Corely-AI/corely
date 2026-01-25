import { z } from "zod";
import { type PromptDefinition } from "../types";

export const approvalPrompts: PromptDefinition[] = [
  {
    id: "approvals.suggest_policy",
    description: "Suggest an approval policy for a sensitive action.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Suggest an approval policy for the following action.\n\n" +
          "Action key: {{ACTION_KEY}}\n" +
          "Description: {{DESCRIPTION}}\n" +
          "Sample payload:\n{{{SAMPLE_PAYLOAD}}}\n\n" +
          "Return steps and rules that indicate when approval is required.",
        variablesSchema: z.object({
          ACTION_KEY: z.string().min(1),
          DESCRIPTION: z.string().optional().default("(none)"),
          SAMPLE_PAYLOAD: z.string().optional().default("(none)"),
        }),
        variables: [
          { key: "ACTION_KEY", kind: "text" },
          { key: "DESCRIPTION", kind: "text" },
          { key: "SAMPLE_PAYLOAD", kind: "block" },
        ],
      },
    ],
    tags: ["approvals", "policy"],
  },
];
