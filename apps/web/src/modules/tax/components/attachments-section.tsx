import React from "react";
import { useRef } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { formatDateTime } from "@/shared/lib/formatters";
import type {
  CreateUploadIntentInput,
  CreateUploadIntentOutput,
  CompleteUploadOutput,
} from "@corely/contracts";
import { useTaxFilingAttachmentsQuery } from "../hooks/useTaxFilingAttachmentsQuery";
import {
  useAttachFilingDocumentMutation,
  useRemoveFilingAttachmentMutation,
} from "../hooks/useTaxFilingMutations";

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
      const contentType = file.type || "application/octet-stream";
      const intent = await apiClient.post<CreateUploadIntentOutput>(
        "/documents/upload-intent",
        {
          filename: file.name,
          contentType,
          sizeBytes: file.size,
          isPublic: false,
          documentType: "UPLOAD",
        } satisfies CreateUploadIntentInput,
        {
          idempotencyKey: apiClient.generateIdempotencyKey(),
          correlationId: apiClient.generateCorrelationId(),
        }
      );

      const headers = new Headers(intent.upload.requiredHeaders ?? {});
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", contentType);
      }

      const uploadResponse = await fetch(intent.upload.url, {
        method: intent.upload.method,
        headers,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const completed = await apiClient.post<CompleteUploadOutput>(
        `/documents/${intent.document.id}/files/${intent.file.id}/complete`,
        { sizeBytes: file.size },
        {
          idempotencyKey: apiClient.generateIdempotencyKey(),
          correlationId: apiClient.generateCorrelationId(),
        }
      );

      await attachMutation.mutateAsync({ documentId: completed.document.id });
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
