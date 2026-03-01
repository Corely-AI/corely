import { z } from "zod";
import { type PromptDefinition } from "../types";

export const invoicePrompts: PromptDefinition[] = [
  {
    id: "invoices.copilot.issue_email.system",
    description: "System prompt for first-send invoice email draft.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "You are Corely Invoice Copilot.\n" +
          "Write in language code: {{LANGUAGE}}. Keep wording simple and natural.\n" +
          "Tone code: {{TONE}} (friendly=friendly and warm but professional, neutral=neutral and professional).\n" +
          "Use ONLY facts provided in the user prompt.\n" +
          "If a field is missing, do not guess.\n" +
          'If bank details are missing, include this exact sentence: "{{MISSING_BANK_DETAILS_LINE}}"\n' +
          "If due date is missing, omit the date or use 'as soon as possible'.\n" +
          "Never include threats, legal claims, legal deadlines, debt collection, court actions, or penalties.\n" +
          "Output must be EXACTLY this format:\n" +
          "Subject: <one line>\n\n" +
          "<body text>\n" +
          "No markdown. No HTML.",
        variablesSchema: z.object({
          LANGUAGE: z.string().min(2),
          TONE: z.string().min(1),
          MISSING_BANK_DETAILS_LINE: z.string().min(1),
        }),
        variables: [
          { key: "LANGUAGE", kind: "text" },
          { key: "TONE", kind: "text" },
          { key: "MISSING_BANK_DETAILS_LINE", kind: "text" },
        ],
      },
    ],
    tags: ["invoices", "copilot", "email"],
  },
  {
    id: "invoices.copilot.issue_email.user",
    description: "User prompt for first-send invoice email draft.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Draft type: FIRST SEND (invoice issued/sent notification)\n" +
          "Facts (JSON):\n" +
          "{{{FACTS_JSON}}}\n" +
          "Goal: short email that confirms invoice is issued/sent and includes payment details when present.",
        variablesSchema: z.object({
          FACTS_JSON: z.string().min(2),
        }),
        variables: [{ key: "FACTS_JSON", kind: "block" }],
      },
    ],
    tags: ["invoices", "copilot", "email"],
  },
  {
    id: "invoices.copilot.reminder_email.system",
    description: "System prompt for invoice reminder email draft.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "You are Corely Invoice Copilot.\n" +
          "Write in language code: {{LANGUAGE}}. Keep wording simple and natural.\n" +
          "Tone code: {{TONE}} (polite=polite and gentle, normal=normal and professional, firm=firm but respectful).\n" +
          "Use ONLY facts provided in the user prompt.\n" +
          "If a field is missing, do not guess.\n" +
          'If bank details are missing, include this exact sentence: "{{MISSING_BANK_DETAILS_LINE}}"\n' +
          "If due date is missing, omit the date or use 'as soon as possible'.\n" +
          "Never include threats, legal claims, legal deadlines, debt collection, court actions, or penalties.\n" +
          "Output must be EXACTLY this format:\n" +
          "Subject: <one line>\n\n" +
          "<body text>\n" +
          "No markdown. No HTML.",
        variablesSchema: z.object({
          LANGUAGE: z.string().min(2),
          TONE: z.string().min(1),
          MISSING_BANK_DETAILS_LINE: z.string().min(1),
        }),
        variables: [
          { key: "LANGUAGE", kind: "text" },
          { key: "TONE", kind: "text" },
          { key: "MISSING_BANK_DETAILS_LINE", kind: "text" },
        ],
      },
    ],
    tags: ["invoices", "copilot", "email"],
  },
  {
    id: "invoices.copilot.reminder_email.user",
    description: "User prompt for invoice reminder email draft.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Draft type: PAYMENT REMINDER\n" +
          "Facts (JSON):\n" +
          "{{{FACTS_JSON}}}\n" +
          "Goal: short reminder that asks for payment and provides the safest next step.\n" +
          "If amountDueCents <= 0, do not draft payment requests.",
        variablesSchema: z.object({
          FACTS_JSON: z.string().min(2),
        }),
        variables: [{ key: "FACTS_JSON", kind: "block" }],
      },
    ],
    tags: ["invoices", "copilot", "email"],
  },
];
