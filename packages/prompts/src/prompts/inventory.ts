import { z } from "zod";
import { type PromptDefinition } from "../types";

export const inventoryPrompts: PromptDefinition[] = [
  {
    id: "inventory.extract_product_proposal",
    description: "Extract a product proposal from unstructured text.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "Extract a product proposal from this text.\n\nText:\n{{{SOURCE_TEXT}}}",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
        }),
        variables: [{ key: "SOURCE_TEXT", kind: "block" }],
      },
    ],
    tags: ["inventory", "extraction"],
  },
  {
    id: "inventory.extract_receipt_draft",
    description: "Extract a receipt draft from unstructured text.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "Extract a receipt draft from this text.\n\nText:\n{{{SOURCE_TEXT}}}",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
        }),
        variables: [{ key: "SOURCE_TEXT", kind: "block" }],
      },
    ],
    tags: ["inventory", "extraction"],
  },
  {
    id: "inventory.extract_delivery_draft",
    description: "Extract a delivery draft from unstructured text.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "Extract a delivery draft from this text.\n\nText:\n{{{SOURCE_TEXT}}}",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
        }),
        variables: [{ key: "SOURCE_TEXT", kind: "block" }],
      },
    ],
    tags: ["inventory", "extraction"],
  },
  {
    id: "inventory.suggest_reorder_policy",
    description: "Suggest a reorder policy based on demand patterns.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template: "Suggest a reorder policy based on recent demand patterns.",
        variablesSchema: z.object({}),
        variables: [],
      },
    ],
    tags: ["inventory", "planning"],
  },
];
