import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { DealStageSelect } from "./DealStageSelect";
import type { DealDto } from "@corely/contracts";
import { Mail, StickyNote, Trash2 } from "lucide-react";

interface DealQuickActionsProps {
  deal: DealDto;
  stages: { id: string; name: string; isClosed?: boolean }[];
  onChangeStage?: (stageId: string) => void;
  onMarkWon?: () => void;
  onMarkLost?: (reason?: string) => void;
  onQuickNote?: (subject: string, body?: string) => void;
  onDelete?: () => void;
  disabled?: boolean;
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
}) => {
  const [noteSubject, setNoteSubject] = useState("");
  const [noteBody, setNoteBody] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
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
            Mark won
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => onMarkLost?.()}
            disabled={disabled}
          >
            Mark lost
          </Button>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <StickyNote className="h-4 w-4" />
            Quick note
          </div>
          <Input
            placeholder="Subject"
            value={noteSubject}
            onChange={(e) => setNoteSubject(e.target.value)}
          />
          <Textarea
            rows={3}
            placeholder="Details"
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
            Add note
          </Button>
        </div>
        <Button variant="outline" className="w-full justify-start" asChild>
          <a
            href={`mailto:?subject=${encodeURIComponent(deal.title)}`}
            className="flex items-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Send email
          </a>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive"
          onClick={onDelete}
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete deal
        </Button>
      </CardContent>
    </Card>
  );
};
