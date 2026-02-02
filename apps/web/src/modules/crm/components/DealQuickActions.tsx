import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { DealStageSelect } from "./DealStageSelect";
import type { ChannelDefinition, DealDto } from "@corely/contracts";
import { Mail, MessageCircle, StickyNote, Trash2, Linkedin } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DealQuickActionsProps {
  deal: DealDto;
  stages: { id: string; name: string; isClosed?: boolean }[];
  onChangeStage?: (stageId: string) => void;
  onMarkWon?: () => void;
  onMarkLost?: (reason?: string) => void;
  onQuickNote?: (subject: string, body?: string) => void;
  onDelete?: () => void;
  disabled?: boolean;
  channels?: ChannelDefinition[];
  onSelectChannel?: (channel: ChannelDefinition) => void;
  contactContext?: Record<string, string | undefined>;
  channelsLoading?: boolean;
}

export const DealQuickActions: React.FC<DealQuickActionsProps> = ({
  deal,
  stages,
  onChangeStage,
  onMarkWon,
  onMarkLost,
  onQuickNote,
  onDelete,
  disabled,
  channels = [],
  onSelectChannel,
  contactContext = {},
  channelsLoading = false,
}) => {
  const { t } = useTranslation();
  const [noteSubject, setNoteSubject] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const channelIcons: Record<string, JSX.Element> = useMemo(
    () => ({
      whatsapp: <MessageCircle className="h-4 w-4" />,
      linkedin: <Linkedin className="h-4 w-4" />,
      email: <Mail className="h-4 w-4" />,
    }),
    []
  );

  const canUseChannel = (channel: ChannelDefinition) =>
    channel.requiredContactFields.every((field) => contactContext[field]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("crm.deals.quickActions")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DealStageSelect
          value={deal.stageId}
          stages={stages}
          onChange={(value) => onChangeStage?.(value)}
          disabled={disabled}
        />
        <div className="flex gap-2">
          <Button className="flex-1" variant="accent" onClick={onMarkWon} disabled={disabled}>
            {t("crm.deals.markWon")}
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => onMarkLost?.()}
            disabled={disabled}
          >
            {t("crm.deals.markLost")}
          </Button>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("crm.deals.message")}</p>
          {channelsLoading ? (
            <p className="text-sm text-muted-foreground">{t("crm.deals.channelsLoading")}</p>
          ) : channels.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("crm.deals.noChannels")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {channels
                .filter((c) => c.enabled)
                .sort((a, b) => a.order - b.order)
                .map((channel) => {
                  const enabled = canUseChannel(channel);
                  const icon = channelIcons[channel.key] ?? <MessageCircle className="h-4 w-4" />;
                  const button = (
                    <Button
                      key={channel.key}
                      size="sm"
                      variant="secondary"
                      disabled={disabled || !enabled}
                      onClick={() => onSelectChannel?.(channel)}
                    >
                      {icon}
                      <span className="ml-2">{channel.label}</span>
                    </Button>
                  );
                  if (enabled) {
                    return button;
                  }
                  return (
                    <Tooltip key={channel.key}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent>
                        {t("crm.deals.missingContactFields", {
                          fields: channel.requiredContactFields.join(", "),
                        })}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <StickyNote className="h-4 w-4" />
            {t("crm.deals.quickNote")}
          </div>
          <Input
            placeholder={t("crm.deals.noteSubject")}
            value={noteSubject}
            onChange={(e) => setNoteSubject(e.target.value)}
          />
          <Textarea
            rows={3}
            placeholder={t("crm.deals.noteDetails")}
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
          />
          <Button
            variant="secondary"
            disabled={disabled || !noteSubject.trim()}
            onClick={() => {
              onQuickNote?.(noteSubject, noteBody);
              setNoteSubject("");
              setNoteBody("");
            }}
          >
            {t("crm.deals.addNote")}
          </Button>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive"
          onClick={onDelete}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("crm.deals.delete")}
        </Button>
      </CardContent>
    </Card>
  );
};
