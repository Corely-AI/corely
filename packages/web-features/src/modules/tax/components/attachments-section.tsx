import React from "react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@corely/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@corely/ui";
import { formatDateTime } from "@corely/web-shared/shared/lib/formatters";
import { useTaxFilingAttachmentsQuery } from "../hooks/useTaxFilingAttachmentsQuery";
import {
  useAttachFilingDocumentMutation,
  useRemoveFilingAttachmentMutation,
} from "../hooks/useTaxFilingMutations";
import { uploadTaxDocument } from "../utils/upload-document";

type AttachmentsSectionProps = {
  filingId: string;
};

import { useTranslation } from "react-i18next";

export function AttachmentsSection({ filingId }: AttachmentsSectionProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data, isLoading, isError } = useTaxFilingAttachmentsQuery(filingId);
  const attachMutation = useAttachFilingDocumentMutation(filingId);
  const removeMutation = useRemoveFilingAttachmentMutation(filingId);

  const attachments = data?.items ?? [];

  const locale = t("common.locale", { defaultValue: i18n.language === "de" ? "de-DE" : "en-US" });

  const handleUpload = async (file: File) => {
    try {
      const documentId = await uploadTaxDocument(file);
      await attachMutation.mutateAsync({ documentId });
      toast.success(t("tax.attachments.messages.uploadSuccess"));
    } catch (error) {
      console.error(error);
      toast.error(t("tax.attachments.messages.uploadError"));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("tax.attachments.title")}</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link to="/tax/documents">{t("tax.attachments.attachFromDocuments")}</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachMutation.isPending}
          >
            {t("tax.attachments.uploadAttachment")}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleUpload(file);
              event.currentTarget.value = "";
            }
          }}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("tax.attachments.loading")}</p>
        ) : null}
        {isError ? <p className="text-sm text-destructive">{t("tax.attachments.error")}</p> : null}
        {attachments.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">{t("tax.attachments.empty")}</p>
        ) : null}
        {attachments.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-md border border-border p-3"
          >
            <div>
              <p className="text-sm font-medium">{doc.title ?? t("tax.attachments.untitled")}</p>
              <div className="text-xs text-muted-foreground">
                <p>{t("tax.attachments.type", { type: doc.type })}</p>
                <p>
                  {t("tax.attachments.uploadedAt", { date: formatDateTime(doc.createdAt, locale) })}
                </p>
                <p>{t("tax.attachments.uploader", { name: "—" })}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => removeMutation.mutate(doc.id)}
              disabled={removeMutation.isPending}
            >
              {t("tax.attachments.remove")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
