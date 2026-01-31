import { type RichTextAiRequest } from "@corely/contracts";

export const buildRichTextUserPrompt = (request: RichTextAiRequest, contextSummary?: string) => `
Context:
Preset: ${request.presetId}
Operation: ${request.operation}
Tone: ${request.tone || "neutral"}
Target Language: ${request.targetLanguage || "same as input"}
Allowed Tags: ${JSON.stringify(request.allowedTags)}
Allow Links: ${request.allowLinks}

${contextSummary ? `Entity Context:\n${contextSummary}\n` : ""}

User Instruction:
${request.userInstruction || "(None)"}

Content State:
Full HTML:
"${request.fullHtml || ""}"

${request.selectionHtml ? `Selected HTML to Act On:\n"${request.selectionHtml}"` : "No specific selection (act on full content or generate new)."}

Action:
Perform the "${request.operation}" operation.
If "selectionHtml" is present, prioritize acting on that.
Ensure the output HTML is valid and strictly adheres to "Allowed Tags".
`;
