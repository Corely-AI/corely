import { z } from "zod";
import { type PromptDefinition } from "../types";

export const purchasingPrompts: PromptDefinition[] = [
  {
    id: "purchasing.extract_supplier",
    description: "Extract supplier information from unstructured text.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "Extract supplier information from this text.\n\nText:\n{{{SOURCE_TEXT}}}",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
        }),
        variables: [{ key: "SOURCE_TEXT", kind: "block" }],
      },
    ],
    tags: ["purchasing", "extraction"],
  },
  {
    id: "purchasing.extract_purchase_order",
    description: "Extract a purchase order draft from unstructured text.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "Extract a purchase order draft from this text.\n\nText:\n{{{SOURCE_TEXT}}}",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
        }),
        variables: [{ key: "SOURCE_TEXT", kind: "block" }],
      },
    ],
    tags: ["purchasing", "extraction"],
  },
  {
    id: "purchasing.extract_vendor_bill",
    description: "Extract a vendor bill draft from unstructured text.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "Extract a vendor bill draft from this text.\n\nText:\n{{{SOURCE_TEXT}}}",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
        }),
        variables: [{ key: "SOURCE_TEXT", kind: "block" }],
      },
    ],
    tags: ["purchasing", "extraction"],
  },
  {
    id: "purchasing.categorize_bill_lines",
    description: "Categorize vendor bill lines and suggest GL accounts.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "Categorize vendor bill lines and suggest GL accounts.",
        variablesSchema: z.object({}),
        variables: [],
      },
    ],
    tags: ["purchasing", "classification"],
  },
  {
    id: "purchasing.draft_vendor_email",
    description: "Draft a vendor email based on an objective and optional context.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Draft a vendor email for this objective: {{OBJECTIVE}}\n\nContext:\n{{{CONTEXT}}}",
        variablesSchema: z.object({
          OBJECTIVE: z.string().min(1),
          CONTEXT: z.string().optional().default(""),
        }),
        variables: [
          { key: "OBJECTIVE", kind: "text" },
          { key: "CONTEXT", kind: "block" },
        ],
      },
    ],
    tags: ["purchasing", "communication"],
  },
];
