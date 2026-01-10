import { z } from "zod";
import { type PromptDefinition } from "../types";

export const crmPrompts: PromptDefinition[] = [
  {
    id: "crm.extract_party",
    description: "Extract party information from unstructured text.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Extract party information from this text.\n" +
          "{{SUGGESTED_ROLES_LINE}}\n\n" +
          "Text:\n{{{SOURCE_TEXT}}}",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
          SUGGESTED_ROLES_LINE: z.string().optional().default(""),
        }),
        variables: [
          { key: "SUGGESTED_ROLES_LINE", kind: "text" },
          { key: "SOURCE_TEXT", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "extraction"],
  },
  {
    id: "crm.extract_deal",
    description: "Extract deal/opportunity information from text.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Extract deal/opportunity information from this text.\n" +
          "{{ASSOCIATED_PARTY_LINE}}\n\n" +
          "Text:\n{{{SOURCE_TEXT}}}",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
          ASSOCIATED_PARTY_LINE: z.string().optional().default(""),
        }),
        variables: [
          { key: "ASSOCIATED_PARTY_LINE", kind: "text" },
          { key: "SOURCE_TEXT", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "extraction"],
  },
  {
    id: "crm.follow_up_suggestions",
    description: "Generate suggested follow-up activities for a deal.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Generate 2-4 suggested follow-up activities for this deal:\n\n" +
          "Deal: {{DEAL_TITLE}}\n" +
          "Stage: {{DEAL_STAGE}}\n" +
          "Amount: {{DEAL_AMOUNT}}\n" +
          "Expected Close: {{DEAL_EXPECTED_CLOSE}}\n" +
          "Notes: {{DEAL_NOTES}}\n\n" +
          "Existing Activities:\n{{{EXISTING_ACTIVITIES}}}\n\n" +
          "{{{CONTEXT_SECTION}}}\n\n" +
          "Suggest practical next steps to move this deal forward.",
        variablesSchema: z.object({
          DEAL_TITLE: z.string().min(1),
          DEAL_STAGE: z.string().min(1),
          DEAL_AMOUNT: z.string().min(1),
          DEAL_EXPECTED_CLOSE: z.string().min(1),
          DEAL_NOTES: z.string().min(1),
          EXISTING_ACTIVITIES: z.string().min(1),
          CONTEXT_SECTION: z.string().min(1),
        }),
        variables: [
          { key: "DEAL_TITLE", kind: "text" },
          { key: "DEAL_STAGE", kind: "text" },
          { key: "DEAL_AMOUNT", kind: "text" },
          { key: "DEAL_EXPECTED_CLOSE", kind: "text" },
          { key: "DEAL_NOTES", kind: "text" },
          { key: "EXISTING_ACTIVITIES", kind: "block" },
          { key: "CONTEXT_SECTION", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "suggestions"],
  },
];
