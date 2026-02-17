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
  {
    id: "crm.ai.deal_insights",
    description: "Generate structured AI insights for a CRM deal object page.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Generate strict JSON only for deal insights.\n" +
          "Language: {{LANGUAGE}}\n\n" +
          "Deal:\n{{{DEAL_JSON}}}\n\n" +
          "Timeline:\n{{{TIMELINE_CONTEXT}}}\n\n" +
          "Missing hints:\n{{{MISSING_HINTS_JSON}}}\n\n" +
          "Return JSON with keys: summary, whatMissing, keyEntities, confidence.\n" +
          "summary = {situation,lastInteraction,keyStakeholders,needs,objections,nextStep}\n" +
          "whatMissing[] = {code,label,reason?,severity}\n" +
          "keyEntities[] = {kind,value,confidence?}\n" +
          "If unknown, use 'Unknown' or empty arrays. No markdown.",
        variablesSchema: z.object({
          LANGUAGE: z.string().min(2),
          DEAL_JSON: z.string().min(2),
          TIMELINE_CONTEXT: z.string().min(1),
          MISSING_HINTS_JSON: z.string().min(2),
        }),
        variables: [
          { key: "LANGUAGE", kind: "text" },
          { key: "DEAL_JSON", kind: "block" },
          { key: "TIMELINE_CONTEXT", kind: "block" },
          { key: "MISSING_HINTS_JSON", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "ai", "insights"],
  },
  {
    id: "crm.ai.deal_message_draft",
    description: "Generate channel-specific message variants for a deal follow-up.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Return strict JSON only.\n" +
          "Channel: {{CHANNEL}}\n" +
          "Language: {{LANGUAGE}}\n" +
          "PersonalizeWithTimeline: {{PERSONALIZE_WITH_TIMELINE}}\n\n" +
          "Deal:\n{{{DEAL_JSON}}}\n\n" +
          "Timeline:\n{{{TIMELINE_CONTEXT}}}\n\n" +
          "Output keys: channel, language, variants, personalizeWithTimeline, translateToWorkspaceLanguage, placeholdersUsed.\n" +
          "variants must include styles short, normal, assertive with body and optional subject.\n" +
          "placeholdersUsed[] = {key,value,fallback}. No markdown.",
        variablesSchema: z.object({
          CHANNEL: z.string().min(2),
          LANGUAGE: z.string().min(2),
          PERSONALIZE_WITH_TIMELINE: z.string().min(1),
          DEAL_JSON: z.string().min(2),
          TIMELINE_CONTEXT: z.string().min(1),
        }),
        variables: [
          { key: "CHANNEL", kind: "text" },
          { key: "LANGUAGE", kind: "text" },
          { key: "PERSONALIZE_WITH_TIMELINE", kind: "text" },
          { key: "DEAL_JSON", kind: "block" },
          { key: "TIMELINE_CONTEXT", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "ai", "messages"],
  },
  {
    id: "crm.ai.activity_parse",
    description: "Parse a natural-language activity description into structured fields.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Parse this text into a CRM activity JSON object.\n" +
          "Language: {{LANGUAGE}}\n\n" +
          "Text:\n{{{USER_TEXT}}}\n\n" +
          "Return strict JSON keys: activityType, subject, dueAt, notesTemplate, confidence.\n" +
          "activityType must be NOTE|TASK|CALL|MEETING|COMMUNICATION.\n" +
          "dueAt must be ISO datetime or null.\n" +
          "Use null/empty when unknown. No markdown.",
        variablesSchema: z.object({
          LANGUAGE: z.string().min(2),
          USER_TEXT: z.string().min(1),
        }),
        variables: [
          { key: "LANGUAGE", kind: "text" },
          { key: "USER_TEXT", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "ai", "activities"],
  },
  {
    id: "crm.ai.activity_extract",
    description: "Summarize notes and extract follow-up action items.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Summarize CRM notes and extract action items.\n" +
          "Language: {{LANGUAGE}}\n\n" +
          "Notes:\n{{{NOTES_TEXT}}}\n\n" +
          "Return strict JSON keys: summary, actionItems, confidence.\n" +
          "actionItems[] = {subject,details?,suggestedType,dueAt?,confidence}.\n" +
          "suggestedType must be TASK|CALL|MEETING|NOTE|COMMUNICATION.\n" +
          "If no actions, return empty array. No markdown.",
        variablesSchema: z.object({
          LANGUAGE: z.string().min(2),
          NOTES_TEXT: z.string().min(1),
        }),
        variables: [
          { key: "LANGUAGE", kind: "text" },
          { key: "NOTES_TEXT", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "ai", "activities"],
  },
  {
    id: "crm.ai.communication_summarize",
    description: "Summarize communication and extract follow-up actions.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Summarize this communication for CRM timeline.\n" +
          "Language: {{LANGUAGE}}\n\n" +
          "Message:\n{{{MESSAGE_BODY}}}\n\n" +
          "Return strict JSON keys: summary, actionItems, confidence.\n" +
          "actionItems[] = {subject,details?,suggestedType,dueAt?,confidence}. No markdown.",
        variablesSchema: z.object({
          LANGUAGE: z.string().min(2),
          MESSAGE_BODY: z.string().min(1),
        }),
        variables: [
          { key: "LANGUAGE", kind: "text" },
          { key: "MESSAGE_BODY", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "ai", "communications"],
  },
  {
    id: "crm.ai.intent_sentiment",
    description: "Classify intent and sentiment labels for inbound CRM messages.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Classify intent and sentiment for this inbound message.\n" +
          "Language: {{LANGUAGE}}\n\n" +
          "Message:\n{{{MESSAGE_BODY}}}\n\n" +
          "Return strict JSON keys: enabled, intentLabels, sentiment, confidence.\n" +
          "intentLabels must only use: question, interested, pricing, negotiation, objection, support, unknown.\n" +
          "sentiment must be positive|neutral|negative|mixed. No markdown.",
        variablesSchema: z.object({
          LANGUAGE: z.string().min(2),
          MESSAGE_BODY: z.string().min(1),
        }),
        variables: [
          { key: "LANGUAGE", kind: "text" },
          { key: "MESSAGE_BODY", kind: "block" },
        ],
      },
    ],
    tags: ["crm", "ai", "communications"],
  },
];
