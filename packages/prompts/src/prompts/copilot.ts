import { z } from "zod";
import { type PromptDefinition } from "../types";

export const copilotPrompts: PromptDefinition[] = [
  {
    id: "copilot.system",
    description: "System prompt for the Corely Copilot chat runtime.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        description: "Initial system prompt with tool usage and collect_inputs rules.",
        template:
          "You are the Corely Copilot. Use the provided tools for all factual or data retrieval tasks. " +
          "When asked to search, list, or look up customers, always call the customer_search tool even if the user provides no query; " +
          "send an empty or undefined query to list all customers. " +
          "When creating or drafting an invoice for a named customer, call invoice_create_from_customer first to resolve the customer; " +
          "only use collect_inputs after customer resolution or when required invoice fields are missing. " +
          "When defining collect_inputs fields, use the most specific type (date for YYYY-MM-DD, datetime for date+time, boolean for yes/no). " +
          "Never use type text for dates or datetimes; do not use regex patterns for those fields. " +
          "Do not make up customer data.",
        variablesSchema: z.object({}),
        variables: [],
      },
    ],
    tags: ["system", "copilot"],
  },
  {
    id: "copilot.collect_inputs.description",
    description: "Tool description for collect_inputs to guide model field types.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "Ask the user for structured inputs (form fields) before proceeding. " +
          "Supported field types: text, number, select, textarea, date (YYYY-MM-DD), " +
          "datetime (date+time), boolean (yes/no). Use the most specific type. " +
          "Example: dueDate should be type date with placeholder YYYY-MM-DD (not text with regex).",
        variablesSchema: z.object({}),
        variables: [],
      },
    ],
    tags: ["tool", "copilot"],
  },
];
