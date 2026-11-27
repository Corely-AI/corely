import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ChannelDefinition } from "@corely/contracts";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@corely/ui";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { interpolateTemplate } from "@/modules/crm/lib/channel-templating";
import {
  isEmailChannel,
  TEMPLATE_PREVIEW_CONTEXT,
  TEMPLATE_VARIABLES,
  type TemplateFormState,
} from "./engagement-template-utils";

type EngagementTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formState: TemplateFormState;
  setFormState: Dispatch<SetStateAction<TemplateFormState>>;
  channels: ChannelDefinition[];
  isSaving: boolean;
  isGeneratingAi: boolean;
  onSave: () => void;
  onGenerateAi: (context?: string) => void;
};

export function EngagementTemplateDialog(props: EngagementTemplateDialogProps) {
  const uiCopy = useUiCopy("ui.settings-engagement-template-dialog");
  const {
    open,
    onOpenChange,
    formState,
    setFormState,
    channels,
    isSaving,
    isGeneratingAi,
    onSave,
    onGenerateAi,
  } = props;

  const [focusedField, setFocusedField] = useState<"subject" | "body" | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");
  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setFocusedField(null);
    setAiPanelOpen(false);
    setAiContext("");
  }, [open, formState.id]);

  const previewSubject = useMemo(() => {
    if (!isEmailChannel(formState.channel)) {
      return "";
    }
    if (!formState.subject.trim()) {
      return "-";
    }
    return (
      interpolateTemplate(formState.subject, TEMPLATE_PREVIEW_CONTEXT, formState.channel) || "-"
    );
  }, [formState.channel, formState.subject]);

  const previewBody = useMemo(() => {
    if (!formState.body.trim()) {
      return "-";
    }
    return interpolateTemplate(formState.body, TEMPLATE_PREVIEW_CONTEXT, formState.channel) || "-";
  }, [formState.body, formState.channel]);

  const handleCopyVariable = async (key: string) => {
    try {
      await navigator.clipboard.writeText(`{${key}}`);
      toast.success(`Copied {${key}}`);
    } catch {
      toast.error(uiCopy("failed-to-copy-variable"));
    }
  };

  const insertAtCursor = (
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string,
    token: string,
    onChange: (next: string) => void
  ) => {
    const selectionStart = element.selectionStart ?? value.length;
    const selectionEnd = element.selectionEnd ?? value.length;
    const nextValue = `${value.slice(0, selectionStart)}${token}${value.slice(selectionEnd)}`;
    onChange(nextValue);

    const nextCursor = selectionStart + token.length;
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleInsertVariable = (key: string) => {
    const token = `{${key}}`;
    const shouldInsertSubject = focusedField === "subject" && isEmailChannel(formState.channel);

    if (shouldInsertSubject && subjectInputRef.current) {
      insertAtCursor(subjectInputRef.current, formState.subject, token, (nextSubject) => {
        setFormState((current) => ({ ...current, subject: nextSubject }));
      });
      return;
    }

    if (bodyTextareaRef.current) {
      insertAtCursor(bodyTextareaRef.current, formState.body, token, (nextBody) => {
        setFormState((current) => ({ ...current, body: nextBody }));
      });
      return;
    }

    setFormState((current) => ({ ...current, body: `${current.body}${token}` }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {formState.id ? uiCopy("edit-template") : uiCopy("create-template")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="template-channel">{uiCopy("channel")}</Label>
              <Select
                value={formState.channel}
                onValueChange={(channel) =>
                  setFormState((current) => ({
                    ...current,
                    channel,
                    subject: isEmailChannel(channel) ? current.subject : "",
                  }))
                }
              >
                <SelectTrigger id="template-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.key} value={channel.key}>
                      {channel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="template-name">{uiCopy("name")}</Label>
              <Input
                id="template-name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={uiCopy("template-name")}
              />
            </div>

            <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">{uiCopy("ai-generate")}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAiPanelOpen((current) => !current)}
                >
                  <Sparkles className="h-4 w-4 mr-1" />
                  {aiPanelOpen ? uiCopy("hide") : uiCopy("generate-with-ai")}
                </Button>
              </div>
              {aiPanelOpen ? (
                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="template-ai-context">{uiCopy("context-optional")}</Label>
                    <Textarea
                      id="template-ai-context"
                      rows={3}
                      value={aiContext}
                      onChange={(event) => setAiContext(event.target.value)}
                      placeholder={uiCopy("example-friendly-tone-short")}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {uiCopy("include-style-audience-and")}
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onGenerateAi(aiContext.trim() || undefined)}
                      disabled={isGeneratingAi}
                    >
                      {isGeneratingAi ? uiCopy("generating") : uiCopy("generate")}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {isEmailChannel(formState.channel) ? (
              <div className="space-y-1.5">
                <Label htmlFor="template-subject">{uiCopy("subject")}</Label>
                <Input
                  id="template-subject"
                  ref={subjectInputRef}
                  value={formState.subject}
                  onFocus={() => setFocusedField("subject")}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, subject: event.target.value }))
                  }
                  placeholder={uiCopy("email-subject")}
                />
                <p className="text-xs text-muted-foreground">
                  {uiCopy("preview") + " "}
                  <span className="text-foreground">{previewSubject}</span>
                </p>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="template-body">{uiCopy("body")}</Label>
              <Textarea
                id="template-body"
                ref={bodyTextareaRef}
                rows={8}
                value={formState.body}
                onFocus={() => setFocusedField("body")}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, body: event.target.value }))
                }
                placeholder={uiCopy("template-body")}
              />
              <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">
                {uiCopy("preview") + " "}
                <span className="text-foreground">{previewBody}</span>
              </p>
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
            <div className="text-sm font-medium text-foreground">
              {uiCopy("how-to-use-variables")}
            </div>
            <p className="text-xs text-muted-foreground">
              {uiCopy("use-placeholders-in-curly") + " "}
              <code>{uiCopy("fullname")}</code>
              {" " + uiCopy("or")} <code>{uiCopy("firstname")}</code>
              {uiCopy("values-are-filled-automatically")}
            </p>
            <div className="space-y-1.5">
              {TEMPLATE_VARIABLES.map((variable) => (
                <div key={variable.key} className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    <code className="text-foreground">{`{${variable.key}}`}</code> -{" "}
                    {variable.description}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleInsertVariable(variable.key)}
                    >
                      {uiCopy("insert")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => {
                        void handleCopyVariable(variable.key);
                      }}
                    >
                      {uiCopy("copy")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {uiCopy("cancel")}
          </Button>
          <Button variant="accent" onClick={onSave} disabled={isSaving || isGeneratingAi}>
            {isSaving ? uiCopy("saving") : uiCopy("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
