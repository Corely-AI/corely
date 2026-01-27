import { z } from "zod";
import { type PromptDefinition } from "../types";

export const cmsPrompts: PromptDefinition[] = [
  {
    id: "cms.generate_draft",
    description: "Generate a CMS article draft with SEO metadata.",
    defaultVersion: "v1",
    versions: [
      {
        version: "v1",
        template:
          "You are a CMS writing assistant. Draft an article for the topic below.\n\n" +
          "Topic: {{TOPIC}}\n" +
          "Target keyword: {{KEYWORD}}\n" +
          "Tone: {{TONE}}\n" +
          "Language: {{LANGUAGE}}\n\n" +
          "Requirements:\n" +
          "- Use the target keyword naturally in the title, excerpt, and body.\n" +
          "- Excerpt should be 1-2 sentences.\n" +
          "- Meta title <= 60 characters; meta description <= 155 characters.\n" +
          "- Return contentJson as a Tiptap JSON document using nodes like doc, paragraph, heading, bulletList, orderedList, listItem, blockquote, text, and hardBreak.\n" +
          "- Do not include images.\n\n" +
          "Return a JSON object with fields: title, excerpt, slugSuggestion, metaTitle, metaDescription, contentJson.",
        variablesSchema: z.object({
          TOPIC: z.string().min(1),
          KEYWORD: z.string().min(1),
          TONE: z.string().min(1),
          LANGUAGE: z.string().min(1),
        }),
        variables: [
          { key: "TOPIC", kind: "text" },
          { key: "KEYWORD", kind: "text" },
          { key: "TONE", kind: "text" },
          { key: "LANGUAGE", kind: "text" },
        ],
      },
    ],
    tags: ["cms", "draft"],
  },
];
