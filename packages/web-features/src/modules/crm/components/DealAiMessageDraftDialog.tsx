import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Switch,
  Label,
  Badge,
} from "@corely/ui";
import type { CrmMessageDraft } from "@corely/contracts";

interface DealAiMessageDraftDialogProps {
  open: boolean;
  offline: boolean;
  loading: boolean;
  channel: string;
  draft: CrmMessageDraft | null;
  onOpenChange: (open: boolean) => void;
  onGenerate: (params: {
    personalizeWithTimeline: boolean;
    translateToWorkspaceLanguage: boolean;
  }) => void;
  onCopy: (text: string) => void;
  onLog: (subject: string | undefined, body: string) => void;
  onCreateFollowUp: (subject: string, body: string) => void;
}

export const DealAiMessageDraftDialog: React.FC<DealAiMessageDraftDialogProps> = ({
  open,
  offline,
  loading,
  channel,
  draft,
  onOpenChange,
  onGenerate,
  onCopy,
  onLog,
  onCreateFollowUp,
}) => {
  const uiCopy = useUiCopy("ui.crm-dealaimessagedraftdialog");
  const [personalizeWithTimeline, setPersonalizeWithTimeline] = useState(true);
  const [translateToWorkspaceLanguage, setTranslateToWorkspaceLanguage] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string>("normal");

  const selectedVariant = useMemo(() => {
    if (!draft?.variants?.length) {
      return null;
    }
    return draft.variants.find((variant) => variant.style === selectedStyle) ?? draft.variants[0];
  }, [draft, selectedStyle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {uiCopy("ai-message-draft")}
            {channel})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={personalizeWithTimeline}
                onCheckedChange={setPersonalizeWithTimeline}
                id="crm-ai-personalize"
              />
              <Label htmlFor="crm-ai-personalize">{uiCopy("personalize-with-timeline")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={translateToWorkspaceLanguage}
                onCheckedChange={setTranslateToWorkspaceLanguage}
                id="crm-ai-translate"
              />
              <Label htmlFor="crm-ai-translate">{uiCopy("translate-to-workspace-language")}</Label>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onGenerate({ personalizeWithTimeline, translateToWorkspaceLanguage })}
              disabled={offline || loading}
            >
              {loading ? uiCopy("generating") : uiCopy("generate")}
            </Button>
          </div>

          {offline ? (
            <p className="text-xs text-muted-foreground">{uiCopy("ai-requires-connection")}</p>
          ) : null}

          {draft?.variants?.length ? (
            <>
              <div className="flex flex-wrap gap-2">
                {draft.variants.map((variant) => (
                  <Button
                    key={variant.style}
                    size="sm"
                    variant={selectedStyle === variant.style ? "accent" : "outline"}
                    onClick={() => setSelectedStyle(variant.style)}
                  >
                    {variant.style}
                  </Button>
                ))}
              </div>
              {selectedVariant ? (
                <div className="rounded-md border p-3 space-y-2">
                  {selectedVariant.subject ? (
                    <p className="text-sm">
                      <span className="font-semibold">{uiCopy("subject")}</span>{" "}
                      {selectedVariant.subject}
                    </p>
                  ) : null}
                  <p className="text-sm whitespace-pre-wrap">{selectedVariant.body}</p>
                </div>
              ) : null}
              {draft.placeholdersUsed.length ? (
                <div className="flex flex-wrap gap-2">
                  {draft.placeholdersUsed.map((placeholder) => (
                    <Badge key={placeholder.key} variant="secondary">
                      {placeholder.key} → {placeholder.value ?? placeholder.fallback}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{uiCopy("generate-a-draft-to")}</p>
          )}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {uiCopy("close")}
          </Button>
          <Button
            variant="secondary"
            disabled={!selectedVariant}
            onClick={() => {
              if (!selectedVariant) {
                return;
              }
              const text = selectedVariant.subject
                ? `${selectedVariant.subject}\n\n${selectedVariant.body}`
                : selectedVariant.body;
              onCopy(text);
            }}
          >
            {uiCopy("copy")}
          </Button>
          <Button
            variant="secondary"
            disabled={!selectedVariant}
            onClick={() => {
              if (!selectedVariant) {
                return;
              }
              onLog(selectedVariant.subject, selectedVariant.body);
            }}
          >
            {uiCopy("log-communication")}
          </Button>
          <Button
            variant="accent"
            disabled={!selectedVariant}
            onClick={() => {
              if (!selectedVariant) {
                return;
              }
              onCreateFollowUp(
                selectedVariant.subject ?? `Follow-up for ${channel}`,
                selectedVariant.body
              );
            }}
          >
            {uiCopy("create-follow-up-activity")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
