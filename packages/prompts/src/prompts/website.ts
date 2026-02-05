import { z } from "zod";
import { type PromptDefinition } from "../types";

export const websitePrompts: PromptDefinition[] = [
  {
    id: "website.generate_page",
    description: "Generate a website page blueprint with CMS content.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "You are a website page generator. Create a page draft based on the prompt.\n\n" +
          "Page type: {{PAGE_TYPE}}\n" +
          "Locale: {{LOCALE}}\n" +
          "Brand voice: {{BRAND_VOICE}}\n" +
          "Suggested path: {{SUGGESTED_PATH}}\n\n" +
          "User prompt:\n{{PROMPT}}\n\n" +
          "Requirements:\n" +
          "- Return STRICT JSON (no markdown, no code fences).\n" +
          "- Fields: title, excerpt, template, suggestedPath, seoTitle, seoDescription, contentJson.\n" +
          "- title and excerpt should be concise and match the page type.\n" +
          "- template should be a short string matching the page type.\n" +
          "- suggestedPath should be a URL path (like /about or /pricing) without query params.\n" +
          "- seoTitle <= 60 chars, seoDescription <= 155 chars.\n" +
          "- contentJson must be a Tiptap JSON document using nodes like doc, paragraph, heading, bulletList, orderedList, listItem, blockquote, text, and hardBreak.\n" +
          "- Do not include images.\n",
        variablesSchema: z.object({
          PAGE_TYPE: z.string().min(1),
          LOCALE: z.string().min(2),
          BRAND_VOICE: z.string().min(1),
          SUGGESTED_PATH: z.string().min(1),
          PROMPT: z.string().min(1),
        }),
        variables: [
          { key: "PAGE_TYPE", kind: "text" },
          { key: "LOCALE", kind: "text" },
          { key: "BRAND_VOICE", kind: "text" },
          { key: "SUGGESTED_PATH", kind: "text" },
          { key: "PROMPT", kind: "text" },
        ],
      },
    ],
    tags: ["website", "draft"],
  },
];
