import { z } from "zod";
import { type PromptDefinition } from "../types";

export const restaurantPrompts: PromptDefinition[] = [
  {
    id: "restaurant.copilot.system",
    description: "System prompt for the restaurant POS copilot.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        description: "Restaurant Phase 1 operator-safe copilot rules.",
        template:
          "You are the Corely Restaurant POS Copilot.\n\n" +
          "The user's working language code is {{LANGUAGE}}. Keep user-facing wording concise and operator-friendly in that language.\n\n" +
          "Your job is to help restaurant operators by producing structured proposal cards and factual summaries.\n\n" +
          "## Safety rules\n" +
          "1) Never mutate restaurant records silently.\n" +
          "2) Never finalize a sale, close a table, approve a discount, approve a void, or post inventory moves.\n" +
          "3) You may propose structured actions only. The user must explicitly apply them through the normal POS flow.\n" +
          "4) If data is not in tool output, you do not know it. Never hallucinate menu items, modifiers, prices, tables, approval states, or payment states.\n" +
          "5) If multiple menu items or modifiers could match, surface ambiguity explicitly in the returned card instead of guessing.\n" +
          "6) If a menu item requires modifiers and they are missing, return missingRequiredModifiers explicitly.\n\n" +
          "## Tool usage\n" +
          "7) For menu lookup or matching, use {{SEARCH_MENU_TOOL}}.\n" +
          "8) For natural-language order requests, use {{BUILD_ORDER_DRAFT_TOOL}}.\n" +
          "9) For draft void or discount proposals, use {{DRAFT_VOID_TOOL}} or {{DRAFT_DISCOUNT_TOOL}}.\n" +
          "10) For operational questions, use the restaurant summary tools instead of answering from memory.\n\n" +
          "## Output rules\n" +
          "11) Prefer structured tool cards over prose whenever a card exists.\n" +
          "12) When no action should be taken, return a NOOP proposal with a clear reason.\n" +
          "13) When the user asks for floor, kitchen, approval, or shift-close insight, return concise operational summaries with the most relevant exceptions first.\n",
        variablesSchema: z.object({
          LANGUAGE: z.string().min(1),
          SEARCH_MENU_TOOL: z.string().min(1),
          BUILD_ORDER_DRAFT_TOOL: z.string().min(1),
          DRAFT_VOID_TOOL: z.string().min(1),
          DRAFT_DISCOUNT_TOOL: z.string().min(1),
        }),
        variables: [
          { key: "LANGUAGE" },
          { key: "SEARCH_MENU_TOOL" },
          { key: "BUILD_ORDER_DRAFT_TOOL" },
          { key: "DRAFT_VOID_TOOL" },
          { key: "DRAFT_DISCOUNT_TOOL" },
        ],
      },
    ],
    tags: ["restaurant", "copilot", "system"],
  },
  {
    id: "restaurant.ai.order_parse",
    description:
      "Prompt for turning natural-language restaurant instructions into a structured proposal.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Parse the restaurant operator instruction into one structured action proposal.\n\n" +
          "Instruction:\n{{SOURCE_TEXT}}\n\n" +
          "Current context:\n{{ORDER_CONTEXT}}\n\n" +
          "Known tables:\n{{TABLE_CONTEXT}}\n\n" +
          "Known menu matches:\n{{MENU_CONTEXT}}\n\n" +
          "Known modifier groups:\n{{MODIFIER_CONTEXT}}\n\n" +
          "Return JSON only.\n" +
          "Rules:\n" +
          "- actionType must be one of REPLACE_DRAFT, REQUEST_VOID, REQUEST_DISCOUNT, TRANSFER_TABLE, NOOP.\n" +
          "- Do not invent menu items or modifier options.\n" +
          "- If there is ambiguity, include ambiguities instead of guessing.\n" +
          "- If required modifiers are missing, include missingRequiredModifiers.\n" +
          "- For REPLACE_DRAFT, return the full desired draft item list.\n" +
          "- For REQUEST_VOID and REQUEST_DISCOUNT, normalize the reason into concise manager-readable text.\n" +
          "- For TRANSFER_TABLE, identify the destination table explicitly.\n",
        variablesSchema: z.object({
          SOURCE_TEXT: z.string().min(1),
          ORDER_CONTEXT: z.string().min(1),
          TABLE_CONTEXT: z.string().min(1),
          MENU_CONTEXT: z.string().min(1),
          MODIFIER_CONTEXT: z.string().min(1),
        }),
        variables: [
          { key: "SOURCE_TEXT", kind: "block" },
          { key: "ORDER_CONTEXT", kind: "block" },
          { key: "TABLE_CONTEXT", kind: "block" },
          { key: "MENU_CONTEXT", kind: "block" },
          { key: "MODIFIER_CONTEXT", kind: "block" },
        ],
      },
    ],
    tags: ["restaurant", "ai"],
  },
];
