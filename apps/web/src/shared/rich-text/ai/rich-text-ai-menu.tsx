import React, { useState } from "react";
import { type Editor } from "@tiptap/react";
import { Sparkles, Loader2, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { type RichTextAiConfig } from "./types";
import { useRichTextAi } from "./rich-text-ai-client";
import { toast } from "sonner";

interface RichTextAiMenuProps {
  editor: Editor | null;
  config: RichTextAiConfig;
}

export function RichTextAiMenu({ editor, config }: RichTextAiMenuProps) {
  const { runAiAction, isLoading } = useRichTextAi(config, editor);
  const [customPromptOpen, setCustomPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");

  if (!editor) {return null;}

  const handleAction = async (operation: any) => {
    try {
      await runAiAction(operation);
      toast.success("AI action completed");
    } catch (e) {
      toast.error("AI action failed");
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) {return;}

    setCustomPromptOpen(false);
    try {
      await runAiAction("generate", customPrompt); // Using 'generate' as generic op
      toast.success("AI action completed");
      setCustomPrompt("");
    } catch (e) {
      toast.error("AI action failed");
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
            AI
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>AI Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleAction("fix_grammar")}>
            Fix Grammar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("rewrite")}>
            Rewrite Selection
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("shorten")}>Shorten</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("expand")}>Expand</DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel>Tone</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleAction("change_tone")}>
            Make Professional
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAction("change_tone")}>
            Make Friendly
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCustomPromptOpen(true)}>
            Custom Instruction...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customPromptOpen} onOpenChange={setCustomPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Custom Instruction</DialogTitle>
            <DialogDescription>Tell the AI what to do with the content.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCustomSubmit} className="space-y-4">
            <Input
              placeholder="e.g. Translate to German, Make it fun..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              disabled={isLoading}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCustomPromptOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Generate
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
