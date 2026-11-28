import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Button,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Input,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@corely/ui";
import { Copy, ExternalLink, Send } from "lucide-react";
import type { ChannelDefinition } from "@corely/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { interpolateTemplate, buildChannelUrl } from "../lib/channel-templating";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { crmApi } from "@corely/web-shared/lib/crm-api";
import { channelTemplateQueryKeys, useChannelTemplates } from "../hooks/useChannelTemplates";

type ChannelComposerDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: ChannelDefinition | null;
  workspaceId: string | null;
  context: Record<string, string | undefined>;
  onLog: (payload: { subject?: string; body: string; openUrl?: string }) => void;
  onOpenAiDraft?: () => void;
  aiDisabled?: boolean;
};

type TemplateOption = {
  value: string;
  id: string;
  source: "workspace" | "system";
  name: string;
  subject: string | null;
  body: string;
};

const PLACEHOLDERS: Array<{ key: string; description: string }> = [
  { key: "fullName", description: "Contact full name" },
  { key: "firstName", description: "Contact first name" },
  { key: "lastName", description: "Contact last name" },
  { key: "dealTitle", description: "Current deal title" },
  { key: "amount", description: "Deal amount" },
  { key: "currency", description: "Deal currency" },
  { key: "email", description: "Primary email" },
  { key: "phoneE164", description: "Primary phone" },
  { key: "profileUrl", description: "Profile URL fallback" },
  { key: "subject", description: "Current draft subject" },
  { key: "message", description: "Current draft body" },
];

export const ChannelComposerDrawer: React.FC<ChannelComposerDrawerProps> = ({
  open,
  onOpenChange,
  channel,
  workspaceId,
  context,
  onLog,
  onOpenAiDraft,
  aiDisabled = false,
}) => {
  const uiCopy = useUiCopy("ui.crm-channelcomposerdrawer");
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [templateValue, setTemplateValue] = useState<string | undefined>();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const { data: templateData, isLoading: templatesLoading } = useChannelTemplates({
    workspaceId,
    channel: channel?.key,
    enabled: open && Boolean(channel?.key),
  });

  const workspaceTemplateOptions = useMemo<TemplateOption[]>(() => {
    if (!channel) {
      return [];
    }

    return (templateData?.workspaceTemplates ?? [])
      .filter((template) => template.channel === channel.key)
      .map((template) => ({
        value: `workspace:${template.id}`,
        id: template.id,
        source: "workspace",
        name: template.name,
        subject: template.subject,
        body: template.body,
      }));
  }, [channel, templateData?.workspaceTemplates]);

  const systemTemplateOptions = useMemo<TemplateOption[]>(() => {
    if (!channel) {
      return [];
    }

    return (templateData?.systemTemplates ?? [])
      .filter((template) => template.channel === channel.key)
      .map((template) => ({
        value: `system:${template.id}`,
        id: template.id,
        source: "system",
        name: template.name,
        subject: template.subject,
        body: template.body,
      }));
  }, [channel, templateData?.systemTemplates]);

  const allTemplateOptions = useMemo(
    () => [...workspaceTemplateOptions, ...systemTemplateOptions],
    [workspaceTemplateOptions, systemTemplateOptions]
  );

  const canCopy = channel?.capabilities.copy;
  const canOpen = channel?.capabilities.open;
  const isSendCapable = Boolean(
    channel?.capabilities.canSendFromCRM && !channel?.capabilities.manualOnly
  );

  const saveAsTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !channel) {
        throw new Error("Workspace and channel are required");
      }

      return crmApi.createChannelTemplate(workspaceId, {
        channel: channel.key,
        name: newTemplateName.trim(),
        subject: channel.capabilities.subject ? subject : undefined,
        body,
      });
    },
    onSuccess: async (result) => {
      setSaveDialogOpen(false);
      setNewTemplateName("");
      setTemplateValue(`workspace:${result.template.id}`);
      await queryClient.invalidateQueries({ queryKey: channelTemplateQueryKeys.all });
      toast.success(uiCopy("template-saved"));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save template");
    },
  });

  const openUrl = useMemo(() => {
    if (!channel) {
      return "";
    }
    const ctx = {
      ...context,
      subject,
      message: body,
      encodedMessage: encodeURIComponent(body ?? ""),
    };
    return buildChannelUrl(channel.action.urlTemplate, ctx, channel.key);
  }, [channel, context, subject, body]);

  const applyTemplate = useCallback(
    (value: string) => {
      if (!channel) {
        return;
      }

      const template = allTemplateOptions.find((item) => item.value === value);
      if (!template) {
        return;
      }

      setTemplateValue(value);
      setBody(interpolateTemplate(template.body, context, channel.key));
      if (channel.capabilities.subject) {
        setSubject(interpolateTemplate(template.subject ?? "", context, channel.key));
      } else {
        setSubject("");
      }
    },
    [allTemplateOptions, channel, context]
  );

  useEffect(() => {
    if (!channel || !open) {
      return;
    }

    const preferred = workspaceTemplateOptions[0] ?? systemTemplateOptions[0];
    if (preferred) {
      applyTemplate(preferred.value);
      return;
    }

    setTemplateValue(undefined);
    setBody("");
    setSubject("");
  }, [channel?.key, context, open, workspaceTemplateOptions, systemTemplateOptions, applyTemplate]);

  if (!channel) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success(t("crm.channel.copySuccess"));
    } catch {
      toast.error(t("crm.channel.copyFailed"));
    }
  };

  const handleOpen = () => {
    if (openUrl) {
      window.open(openUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleLog = () => {
    onLog({ subject, body, openUrl });
  };

  const handleSaveTemplate = () => {
    const normalizedBody = body.trim();
    if (!workspaceId) {
      toast.error(uiCopy("workspace-is-required"));
      return;
    }

    if (!normalizedBody) {
      toast.error(uiCopy("message-body-is-required"));
      return;
    }

    if (channel.capabilities.subject && !subject.trim()) {
      toast.error(uiCopy("subject-is-required-for"));
      return;
    }

    if (!newTemplateName.trim()) {
      toast.error(uiCopy("template-name-is-required"));
      return;
    }

    saveAsTemplateMutation.mutate();
  };

  const copyPlaceholder = async (key: string) => {
    try {
      await navigator.clipboard.writeText(`{${key}}`);
      toast.success(`Copied {${key}}`);
    } catch {
      toast.error(uiCopy("failed-to-copy-placeholder"));
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-6 space-y-4">
          <DrawerHeader data-testid="crm-channel-composer">
            <DrawerTitle>{t("crm.channel.messageVia", { channel: channel.label })}</DrawerTitle>
          </DrawerHeader>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>{t("crm.channel.template")}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!workspaceId}
                      onClick={() =>
                        navigate(
                          `/settings/engagement/templates?channel=${encodeURIComponent(channel.key)}`
                        )
                      }
                    >
                      {uiCopy("manage-templates")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!workspaceId}
                      onClick={() => {
                        setNewTemplateName("");
                        setSaveDialogOpen(true);
                      }}
                    >
                      {uiCopy("save-as-template")}
                    </Button>
                  </div>
                </div>

                {templatesLoading ? (
                  <div className="text-sm text-muted-foreground">{uiCopy("loading-templates")}</div>
                ) : allTemplateOptions.length > 0 ? (
                  <Select value={templateValue} onValueChange={applyTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("crm.channel.chooseTemplate")} />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaceTemplateOptions.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>{uiCopy("workspace-templates")}</SelectLabel>
                          {workspaceTemplateOptions.map((template) => (
                            <SelectItem key={template.value} value={template.value}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                      {systemTemplateOptions.length > 0 ? (
                        <SelectGroup>
                          <SelectLabel>{uiCopy("system-templates")}</SelectLabel>
                          {systemTemplateOptions.map((template) => (
                            <SelectItem key={template.value} value={template.value}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ) : null}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {uiCopy("no-templates-yet-for")}
                  </div>
                )}
              </div>

              {channel.capabilities.subject && (
                <div className="space-y-2">
                  <Label>{t("crm.channel.subject")}</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    data-testid="crm-channel-subject"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>{t("crm.channel.message")}</Label>
                <Textarea
                  rows={7}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  data-testid="crm-channel-message"
                />
              </div>
            </div>

            <aside className="rounded-lg border border-border bg-muted/40 p-3 space-y-3">
              <div>
                <div className="text-sm font-medium text-foreground">{uiCopy("placeholders")}</div>
                <div className="text-xs text-muted-foreground">
                  {uiCopy("insert-dynamic-deal-contact")}
                </div>
              </div>
              <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                {PLACEHOLDERS.map((placeholder) => (
                  <div
                    key={placeholder.key}
                    className="rounded-md border border-border bg-background p-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs">{`{${placeholder.key}}`}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          void copyPlaceholder(placeholder.key);
                        }}
                      >
                        {uiCopy("copy")}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {placeholder.description}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <DrawerFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {onOpenAiDraft && (
              <Button variant="outline" onClick={onOpenAiDraft} disabled={aiDisabled}>
                {uiCopy("ai-draft")}
              </Button>
            )}
            {canCopy && (
              <Button variant="secondary" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-1" />
                {t("common.copy")}
              </Button>
            )}
            {canOpen && (
              <Button
                variant="outline"
                onClick={handleOpen}
                disabled={!openUrl}
                data-testid="crm-channel-open-link"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {t("common.open")}
              </Button>
            )}
            <Button variant="accent" onClick={handleLog} data-testid="crm-channel-log">
              <Send className="h-4 w-4 mr-1" />
              {isSendCapable ? t("common.save") : t("crm.channel.log")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{uiCopy("save-draft-as-template")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="crm-template-name">{uiCopy("template-name")}</Label>
              <Input
                id="crm-template-name"
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
                placeholder={uiCopy("e-g-follow-up")}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{uiCopy("channel")}</Label>
              <Input value={channel.label} readOnly className="bg-muted" />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={saveAsTemplateMutation.isPending}
            >
              {uiCopy("cancel")}
            </Button>
            <Button
              variant="accent"
              onClick={handleSaveTemplate}
              disabled={saveAsTemplateMutation.isPending}
            >
              {saveAsTemplateMutation.isPending ? uiCopy("saving") : uiCopy("save-template")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
