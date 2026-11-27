import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff } from "lucide-react";
import { normalizeError } from "@corely/api-client";
import { IssueReportGuidanceSlot } from "@corely/issues-ui";
import { useAuth } from "@corely/web-shared/lib/auth-provider";
import { fileToBase64, getAudioDuration } from "../components/issue-attachment-input";
import { IssueImageInput } from "../components/issue-image-input";
import { issueReportGuidance } from "../issue-report-guidance";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { AttachmentMetadata, UploadFileOutput } from "@corely/contracts";
import { apiClient } from "@/lib/api-client";
import { issuesApi } from "@/lib/issues-api";
import { cmsApi, buildPublicFileUrl } from "@/lib/cms-api";
import { Button } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { Input } from "@corely/ui";
import { Label } from "@corely/ui";
import { Textarea } from "@corely/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@corely/ui";
import { issueKeys } from "../queries";
import { issueFormSchema, type IssueFormValues } from "../schemas/issue-form.schema";

const SpeechRecognitionCtor =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

type UploadedAttachment = AttachmentMetadata & {
  name: string;
  fileId?: string;
};

export default function NewIssuePage() {
  const uiCopy = useUiCopy("ui.issues-newissuepage");
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantId = useAuth().user?.activeTenantId;
  type ImageState = {
    id: string;
    file: File;
    previewUrl: string;
    isUploading: boolean;
    fileId?: string;
    documentId?: string;
  };

  const [imageState, setImageState] = useState<ImageState[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<any | null>(null);

  // Camera state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      priority: "MEDIUM",
      siteType: "FIELD",
    },
  });

  const canUseSpeech = useMemo(() => Boolean(SpeechRecognitionCtor), []);

  const uploadFile = async (file: File, kind: "IMAGE" | "AUDIO"): Promise<UploadedAttachment> => {
    const base64 = await fileToBase64(file);
    const result = await apiClient.post<UploadFileOutput>("/documents/upload-base64", {
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      base64,
      purpose: "issue-attachment",
    });

    const durationSeconds = kind === "AUDIO" ? await getAudioDuration(file) : undefined;

    return {
      documentId: result.document.id,
      kind,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      durationSeconds,
      name: file.name,
    };
  };

  const createMutation = useMutation({
    mutationFn: async (values: IssueFormValues) => {
      const attachments: UploadedAttachment[] = [];

      for (const img of imageState) {
        if (img.documentId && img.fileId) {
          attachments.push({
            documentId: img.documentId,
            fileId: img.fileId,
            kind: "IMAGE",
            mimeType: img.file.type || "application/octet-stream",
            sizeBytes: img.file.size,
            name: img.file.name,
          });
        }
      }

      for (const file of audioFiles) {
        attachments.push(await uploadFile(file, "AUDIO"));
      }

      setUploadedAttachments(attachments);

      const attachmentsPayload = attachments.map(({ name, ...rest }) => rest);

      return issuesApi.createIssue({
        title: values.title,
        description: values.description,
        priority: values.priority,
        siteType: values.siteType,
        siteId: values.siteId,
        customerPartyId: values.customerPartyId,
        manufacturerPartyId: values.manufacturerPartyId,
        attachments: attachmentsPayload,
        voiceNoteTranscript: values.transcript,
      });
    },
    onSuccess: async (issue) => {
      await queryClient.invalidateQueries({ queryKey: issueKeys.list() });
      toast.success(uiCopy("issue-created"));
      navigate(`/issues/${issue.id}`);
    },
    onError: (error) => {
      console.error(error);
      const problem = normalizeError(error);
      toast.error(
        problem.code === "Issues:ReportPolicyRejected" ? problem.detail : "Failed to create issue"
      );
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, {
          type: blob.type,
        });
        setAudioFiles((prev) => [...prev, file]);
        setVoiceNoteUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        const preferredLocale = i18n.t("common.locale");
        recognition.lang =
          typeof preferredLocale === "string" && preferredLocale.trim().length > 0
            ? preferredLocale
            : i18n.language || "en-US";
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = event.resultIndex; i < event.results.length; i += 1) {
            transcript += event.results[i][0].transcript;
          }
          form.setValue("transcript", transcript.trim());
        };
        recognition.start();
        speechRef.current = recognition;
      }
    } catch (error) {
      console.error(error);
      toast.error(t("issues.errors.microphoneDenied"));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
    if (speechRef.current) {
      speechRef.current.stop();
      speechRef.current = null;
    }
  };

  // Stop camera when dialog closes
  React.useEffect(() => {
    if (!isCameraOpen) {
      stopCamera();
    }
    return () => stopCamera();
  }, [isCameraOpen]);

  const startCamera = async (node?: HTMLVideoElement | null) => {
    const video = node || videoRef.current;
    try {
      if (video && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
        video.srcObject = stream;
      }
    } catch (error) {
      console.error("Camera access denied:", error);
      toast.error(t("issues.errors.cameraDenied") || "Camera access denied");
      setIsCameraOpen(false);
    }
  };

  const videoRefCallback = React.useCallback(
    (node: HTMLVideoElement | null) => {
      if (node) {
        videoRef.current = node;
        void startCamera(node);
      } else {
        stopCamera();
        videoRef.current = null;
      }
    },
    [facingMode]
  );

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const processFiles = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    // Create temporary previews
    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      isUploading: true,
      fileId: undefined as string | undefined,
      documentId: undefined as string | undefined,
    }));

    setImageState((prev) => [...prev, ...newImages]);

    // Upload files
    for (const image of newImages) {
      try {
        const uploaded = await cmsApi.uploadCmsAsset(image.file, {
          purpose: "issue-attachment",
          category: "issue",
        });

        setImageState((prev) =>
          prev.map((p) =>
            p.id === image.id
              ? {
                  ...p,
                  isUploading: false,
                  fileId: uploaded.fileId,
                  documentId: uploaded.documentId,
                  previewUrl: buildPublicFileUrl(uploaded.fileId),
                }
              : p
          )
        );
      } catch (error) {
        console.error("Upload failed", error);
        toast.error(`Failed to upload ${image.file.name}`);
        setImageState((prev) => prev.filter((p) => p.id !== image.id));
      }
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    await processFiles(files);
    event.target.value = "";
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
            void processFiles([file]);
            setIsCameraOpen(false);
          }
        }, "image/jpeg");
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const onSubmit = (values: IssueFormValues) => {
    createMutation.mutate(values);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">{t("issues.reportTitle")}</h1>
        <Button variant="outline" onClick={() => navigate("/issues")}>
          {t("common.cancel")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">{t("issues.fields.title")}</Label>
                <Input id="title" {...form.register("title")} />
              </div>
              <div className="space-y-2">
                <Label>{t("issues.fields.priority")}</Label>
                <Select
                  value={form.watch("priority")}
                  onValueChange={(value) =>
                    form.setValue("priority", value as IssueFormValues["priority"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("issues.placeholders.priority")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">{t("issues.priority.low")}</SelectItem>
                    <SelectItem value="MEDIUM">{t("issues.priority.medium")}</SelectItem>
                    <SelectItem value="HIGH">{t("issues.priority.high")}</SelectItem>
                    <SelectItem value="URGENT">{t("issues.priority.urgent")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("issues.fields.description")}</Label>
              <Textarea id="description" rows={4} {...form.register("description")} />
              <IssueReportGuidanceSlot
                priority={form.watch("priority") ?? "MEDIUM"}
                Guidance={tenantId ? issueReportGuidance.get(tenantId) : undefined}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("issues.fields.siteType")}</Label>
                <Select
                  value={form.watch("siteType")}
                  onValueChange={(value) =>
                    form.setValue("siteType", value as IssueFormValues["siteType"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("issues.placeholders.siteType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIELD">{t("issues.siteTypes.field")}</SelectItem>
                    <SelectItem value="CUSTOMER">{t("issues.siteTypes.customer")}</SelectItem>
                    <SelectItem value="MANUFACTURER">
                      {t("issues.siteTypes.manufacturer")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteId">{t("issues.fields.siteIdOptional")}</Label>
                <Input id="siteId" {...form.register("siteId")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPartyId">{t("issues.fields.customerIdOptional")}</Label>
                <Input id="customerPartyId" {...form.register("customerPartyId")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturerPartyId">
                  {t("issues.fields.manufacturerIdOptional")}
                </Label>
                <Input id="manufacturerPartyId" {...form.register("manufacturerPartyId")} />
              </div>
            </div>

            <IssueImageInput
              imageState={imageState}
              handleImageUpload={handleImageUpload}
              clearImages={() => setImageState([])}
              removeImage={(id) =>
                setImageState((previous) => previous.filter((image) => image.id !== id))
              }
              isCameraOpen={isCameraOpen}
              setIsCameraOpen={setIsCameraOpen}
              videoRefCallback={videoRefCallback}
              toggleCamera={toggleCamera}
              capturePhoto={capturePhoto}
            />

            <div className="space-y-3">
              <Label>{t("issues.voiceNote")}</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  onClick={isRecording ? stopRecording : startRecording}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isRecording ? t("issues.stopRecording") : t("issues.startRecording")}
                </Button>
                {voiceNoteUrl ? <audio controls src={voiceNoteUrl} className="h-8" /> : null}
              </div>
              {canUseSpeech ? (
                <p className="text-xs text-muted-foreground">
                  {t("issues.speech.liveTranscription")}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("issues.speech.notAvailable")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcript">{t("issues.fields.transcriptOptional")}</Label>
              <Textarea id="transcript" rows={3} {...form.register("transcript")} />
            </div>

            <div className="space-y-2">
              <Label>{t("issues.attachments.audio")}</Label>
              <Input
                type="file"
                accept="audio/*"
                multiple
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  setAudioFiles((prev) => [...prev, ...files]);
                }}
              />
            </div>

            {uploadedAttachments.length ? (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{t("issues.attachments.uploaded")}</p>
                <ul className="list-disc list-inside">
                  {uploadedAttachments.map((file) => (
                    <li key={file.documentId}>{file.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button type="submit" variant="accent" disabled={createMutation.isPending}>
                {createMutation.isPending ? t("issues.submitting") : t("issues.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
