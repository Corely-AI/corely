import React, { useState } from "react";
import { type Editor } from "@tiptap/react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@corely/ui";
import { Button } from "@corely/ui";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { type RichTextAiConfig } from "./types";
import { useRichTextAi } from "./rich-text-ai-client";
import { toast } from "sonner";
import type { RichTextAiRequest } from "@corely/contracts";

interface RichTextAiMenuProps {
  editor: Editor | null;
  config: RichTextAiConfig;
}

export function RichTextAiMenu({ editor, config }: RichTextAiMenuProps) {
  const { t } = useTranslation();
  const { runAiAction, isLoading } = useRichTextAi(config, editor);
  const [customPromptOpen, setCustomPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  if (!editor) {
    return null;
  }

  const handleAction = async (operation: RichTextAiRequest["operation"]) => {
    try {
      await runAiAction(operation);
      toast.success(t("ai.richText.actionCompleted"));
    } catch (e) {
      toast.error(t("ai.richText.actionFailed"));
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) {
      return;
    }

    setCustomPromptOpen(false);
    try {
      await runAiAction("generate", customPrompt); // Using 'generate' as generic op
      toast.success(t("ai.richText.actionCompleted"));
      setCustomPrompt("");
    } catch (e) {
      toast.error(t("ai.richText.actionFailed"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {t("ai.richText.label")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{t("ai.richText.actions")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleAction("fix_grammar")}>
            {t("ai.richText.fixGrammar")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("rewrite")}>
            {t("ai.richText.rewriteSelection")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("shorten")}>
            {t("ai.richText.shorten")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("expand")}>
            {t("ai.richText.expand")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>{t("ai.richText.tone")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleAction("change_tone")}>
            {t("ai.richText.makeProfessional")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("change_tone")}>
            {t("ai.richText.makeFriendly")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCustomPromptOpen(true)}>
            {t("ai.richText.customInstruction")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customPromptOpen} onOpenChange={setCustomPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("ai.richText.customInstructionTitle")}</DialogTitle>
            <DialogDescription>{t("ai.richText.customInstructionDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <Input
              placeholder={t("ai.richText.customInstructionPlaceholder")}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCustomPromptOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t("ai.richText.generate")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
