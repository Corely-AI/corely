import React from "react";
import { useRef } from "react";
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

export function AttachmentsSection({ filingId }: AttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { data, isLoading, isError } = useTaxFilingAttachmentsQuery(filingId);
  const attachMutation = useAttachFilingDocumentMutation(filingId);
  const removeMutation = useRemoveFilingAttachmentMutation(filingId);

  const attachments = data?.items ?? [];

  const handleUpload = async (file: File) => {
    try {
      const documentId = await uploadTaxDocument(file);
      await attachMutation.mutateAsync({ documentId });
      toast.success("Attachment uploaded");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload attachment");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Attachments</CardTitle>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={attachMutation.isPending}
        >
          Upload attachment
        </Button>
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
        {isLoading ? <p className="text-sm text-muted-foreground">Loading attachments...</p> : null}
        {isError ? <p className="text-sm text-destructive">Failed to load attachments.</p> : null}
        {attachments.length === 0 && !isLoading ? (
          <p className="text-sm text-muted-foreground">
            Upload supporting documents like receipts or submission confirmations.
          </p>
        ) : null}
        {attachments.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-md border border-border p-3"
          >
            <div>
              <p className="text-sm font-medium">{doc.title ?? "Untitled document"}</p>
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDateTime(doc.createdAt, "en-US")}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => removeMutation.mutate(doc.id)}
              disabled={removeMutation.isPending}
            >
              Remove
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
