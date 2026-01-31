import { useState } from "react";
// import { useCompletion } from "@ai-sdk/react";
import { type RichTextAiRequest, type RichTextAiResponse } from "@corely/contracts";
import { type RichTextAiConfig } from "./types";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

export function useRichTextAi(config: RichTextAiConfig, editor: any) {
  const [isOpen, setIsOpen] = useState(false);
  /*
  // Streaming implementation (Future Use)
  // const { completion, complete, isLoading: isStreaming, stop, error } = useCompletion({
  //   api: "/api/ai/richtext/stream", 
  //   onFinish: (prompt, completion) => {
  //      // Handle streaming completion 
  //   },
  // });
  */
  const [isLoading, setIsLoading] = useState(false);

  const runAiAction = async (
    operation: RichTextAiRequest["operation"],
    userInstruction?: string,
    selectionHtml?: string
  ) => {
    if (!editor) {
      return;
    }

    setIsLoading(true);
    const fullHtml = editor.getHTML();

    // Construct request
    const request: RichTextAiRequest = {
      presetId: config.presetId,
      operation,
      fullHtml,
      selectionHtml: selectionHtml || undefined, // or get from editor
      userInstruction,
      allowedTags: config.allowedTags,
      allowLinks: config.allowLinks,
      entityContext: config.entityContext,
    };

    try {
      // Blocking call using apiClient
      const data = await apiClient.post<RichTextAiResponse>("/ai/richtext", request, {
        correlationId: apiClient.generateCorrelationId(),
      });

      applyAiResponse(editor, data);

      return data;
    } catch (err) {
      console.error(err);
      toast.error("AI Action failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const applyAiResponse = (editor: any, response: RichTextAiResponse) => {
    const { mode, html, summary, warnings } = response;

    if (warnings && warnings.length > 0) {
      console.warn("AI Warnings:", warnings);
      toast.warning(warnings.join("\n"));
    }

    switch (mode) {
      case "replace_selection":
        // If selection exists, replace it. Tiptap specific.
        // If no selection, functionality depends on editor implementation.
        editor.chain().focus().deleteSelection().insertContent(html).run();
        break;
      case "replace_all":
        editor.commands.setContent(html);
        break;
      case "append":
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, html).run();
        break;
      case "insert_after_selection":
        editor.chain().focus().insertContent(html).run();
        break;
    }

    if (summary) {
      toast.success(summary);
    }
  };

  return {
    isOpen,
    setIsOpen,
    runAiAction,
    isLoading,
  };
}
