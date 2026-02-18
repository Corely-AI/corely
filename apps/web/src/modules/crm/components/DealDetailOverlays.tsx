import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@corely/ui";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@corely/ui";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@corely/ui";
import { Input } from "@corely/ui";
import { Alert, AlertDescription, AlertTitle } from "@corely/ui";
import type {
  ChannelDefinition,
  CreateActivityToolCard,
  CrmMessageDraft,
  DealAiRecommendation,
  DealDto,
} from "@corely/contracts";
import { ChannelComposerDrawer } from "./ChannelComposerDrawer";
import { DealAiMessageDraftDialog } from "./DealAiMessageDraftDialog";

interface DealDetailOverlaysProps {
  deal: DealDto;
  selectedChannel: ChannelDefinition | null;
  composerOpen: boolean;
  onComposerOpenChange: (open: boolean) => void;
  templateContext: Record<string, string | undefined>;
  contactContext: Record<string, string | undefined>;
  onLogMessage: (payload: { subject?: string; body: string; openUrl?: string }) => void;
  onOpenAiDraftFromComposer: () => void;
  aiDisabled: boolean;
  aiDraftOpen: boolean;
  onAiDraftOpenChange: (open: boolean) => void;
  aiDraftLoading: boolean;
  aiDraftChannelKey: string;
  aiDraft: CrmMessageDraft | null;
  offline: boolean;
  onGenerateDraft: (params: {
    personalizeWithTimeline: boolean;
    translateToWorkspaceLanguage: boolean;
  }) => void;
  onCopyDraft: (text: string) => void;
  onCreateFollowUpFromDraft: (subject: string, body: string) => void;
  lostDialogOpen: boolean;
  onLostDialogOpenChange: (open: boolean) => void;
  lostReason: string;
  onLostReasonChange: (value: string) => void;
  onConfirmMarkLost: () => void;
  deleteDialogOpen: boolean;
  onDeleteDialogOpenChange: (open: boolean) => void;
  onPrepareDeleteReason: () => void;
  onConfirmDelete: () => void;
  pendingRecommendation: DealAiRecommendation | null;
  onPendingRecommendationOpenChange: (open: boolean) => void;
  onConfirmApplyRecommendation: () => void;
  pendingFollowUpToolCard: CreateActivityToolCard | null;
  onPendingFollowUpOpenChange: (open: boolean) => void;
  onConfirmCreateFollowUp: () => void;
}

export const DealDetailOverlays: React.FC<DealDetailOverlaysProps> = ({
  deal,
  selectedChannel,
  composerOpen,
  onComposerOpenChange,
  templateContext,
  contactContext,
  onLogMessage,
  onOpenAiDraftFromComposer,
  aiDisabled,
  aiDraftOpen,
  onAiDraftOpenChange,
  aiDraftLoading,
  aiDraftChannelKey,
  aiDraft,
  offline,
  onGenerateDraft,
  onCopyDraft,
  onCreateFollowUpFromDraft,
  lostDialogOpen,
  onLostDialogOpenChange,
  lostReason,
  onLostReasonChange,
  onConfirmMarkLost,
  deleteDialogOpen,
  onDeleteDialogOpenChange,
  onPrepareDeleteReason,
  onConfirmDelete,
  pendingRecommendation,
  onPendingRecommendationOpenChange,
  onConfirmApplyRecommendation,
  pendingFollowUpToolCard,
  onPendingFollowUpOpenChange,
  onConfirmCreateFollowUp,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <ChannelComposerDrawer
        open={composerOpen}
        onOpenChange={onComposerOpenChange}
        channel={selectedChannel}
        context={{
          ...templateContext,
          dealTitle: deal.title,
          amount: deal.amountCents ? (deal.amountCents / 100).toString() : undefined,
          currency: deal.currency,
          email: contactContext.email,
          phoneE164: contactContext.phoneE164,
          profileUrl: contactContext.profileUrl,
        }}
        onLog={onLogMessage}
        onOpenAiDraft={onOpenAiDraftFromComposer}
        aiDisabled={aiDisabled}
      />

      <DealAiMessageDraftDialog
        open={aiDraftOpen}
        offline={offline}
        loading={aiDraftLoading}
        channel={aiDraftChannelKey}
        draft={aiDraft}
        onOpenChange={onAiDraftOpenChange}
        onGenerate={onGenerateDraft}
        onCopy={onCopyDraft}
        onLog={(subject, body) => onLogMessage({ subject, body })}
        onCreateFollowUp={onCreateFollowUpFromDraft}
      />

      <Dialog open={lostDialogOpen} onOpenChange={onLostDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("crm.deals.markLostTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("crm.deals.markLostDescription")}</p>
            <Input
              placeholder={t("crm.deals.markLostPlaceholder")}
              value={lostReason}
              onChange={(event) => onLostReasonChange(event.target.value)}
              data-testid="crm-deal-lost-reason"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onLostDialogOpenChange(false)}
              data-testid="crm-deal-lost-cancel"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              data-testid="crm-deal-lost-confirm"
              onClick={onConfirmMarkLost}
            >
              {t("crm.deals.markLost")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          onDeleteDialogOpenChange(open);
          if (open) {
            onPrepareDeleteReason();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("crm.deals.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("crm.deals.deleteDescription", { reason: t("crm.deals.deletedReason") })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete}>{t("crm.deals.delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingRecommendation)}
        onOpenChange={onPendingRecommendationOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRecommendation?.title ?? "Apply recommendation"}
            </AlertDialogTitle>
            <AlertDialogDescription>{pendingRecommendation?.reason}</AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRecommendation ? (
            <Alert>
              <AlertTitle>Explicit confirmation required</AlertTitle>
              <AlertDescription>
                This action applies an AI suggestion and updates CRM data only after confirmation.
              </AlertDescription>
            </Alert>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmApplyRecommendation}>
              {pendingRecommendation?.toolCard.confirmationLabel ?? t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingFollowUpToolCard)}
        onOpenChange={onPendingFollowUpOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingFollowUpToolCard?.title ?? "Create follow-up"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingFollowUpToolCard?.payload.subject}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmCreateFollowUp}>
              {pendingFollowUpToolCard?.confirmationLabel ?? "Create follow-up"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
