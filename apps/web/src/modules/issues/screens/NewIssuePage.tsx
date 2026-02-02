import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { AttachmentMetadata, UploadFileOutput } from "@corely/contracts";
import { apiClient } from "@/lib/api-client";
import { issuesApi } from "@/lib/issues-api";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { issueKeys } from "../queries";
import { issueFormSchema, type IssueFormValues } from "../schemas/issue-form.schema";

const SpeechRecognitionCtor =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

type UploadedAttachment = AttachmentMetadata & {
  name: string;
};

const fileToBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getAudioDuration = (file: Blob) =>
  new Promise<number | undefined>((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : undefined);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => resolve(undefined);
    audio.src = URL.createObjectURL(file);
  });

export default function NewIssuePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [audioFiles, setAudioFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<UploadedAttachment[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<any | null>(null);

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

      for (const file of imageFiles) {
        attachments.push(await uploadFile(file, "IMAGE"));
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
      toast.success("Issue created");
      navigate(`/issues/${issue.id}`);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to create issue");
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

            <div className="space-y-3">
              <Label>{t("issues.attachments.images")}</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  setImageFiles(files);
                }}
              />
            </div>

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
