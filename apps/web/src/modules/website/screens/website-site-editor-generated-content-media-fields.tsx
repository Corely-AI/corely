import { useState } from "react";
import { Button, Input, Label } from "@corely/ui";
import { buildPublicFileUrl } from "@/lib/cms-api";
import {
  toPathStateKey,
  type ExternalContentPath,
} from "./website-site-external-content-generator";

type GeneratedFileIdFieldProps = {
  label: string;
  path: ExternalContentPath;
  fileId: string;
  isUploading: boolean;
  isImageLike: boolean;
  onUpdate: (nextFileId: string) => void;
  onUpload: (path: ExternalContentPath, file: File) => Promise<void>;
};

type GeneratedFileIdListFieldProps = {
  label: string;
  path: ExternalContentPath;
  fileIds: string[];
  isUploading: boolean;
  isImageLike: boolean;
  onUpdate: (nextFileIds: string[]) => void;
  onUpload: (path: ExternalContentPath, files: File[]) => Promise<void>;
};

const buildInputId = (prefix: string, path: ExternalContentPath): string =>
  `${prefix}-${toPathStateKey(path).replace(/[^a-z0-9_-]/gi, "-")}`;

export function GeneratedFileIdField(props: GeneratedFileIdFieldProps) {
  const inputId = buildInputId("generated-file-upload", props.path);
  const publicUrl = props.fileId ? buildPublicFileUrl(props.fileId) : "";

  return (
    <div className="space-y-2 rounded-md border border-border/60 p-3">
      <Label>{props.label}</Label>
      <div className="flex gap-2">
        <Input
          value={props.fileId}
          placeholder="file_xxx"
          onChange={(event) => props.onUpdate(event.target.value.trim())}
        />
        <input
          id={inputId}
          type="file"
          className="hidden"
          accept={props.isImageLike ? "image/*" : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void props.onUpload(props.path, file);
            }
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={props.isUploading}
          onClick={() => {
            const input = document.getElementById(inputId);
            if (input instanceof HTMLInputElement) {
              input.click();
            }
          }}
        >
          {props.isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {props.fileId ? (
        <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
          {props.isImageLike ? (
            <img
              src={publicUrl}
              alt={props.fileId}
              className="h-24 w-full rounded-md object-cover"
            />
          ) : null}
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline underline-offset-2 break-all"
          >
            {props.fileId}
          </a>
        </div>
      ) : null}
    </div>
  );
}

export function GeneratedFileIdListField(props: GeneratedFileIdListFieldProps) {
  const inputId = buildInputId("generated-file-list-upload", props.path);
  const [draftValue, setDraftValue] = useState("");

  const addDraftValue = () => {
    const trimmed = draftValue.trim();
    if (!trimmed) {
      return;
    }
    props.onUpdate(Array.from(new Set([...props.fileIds, trimmed])));
    setDraftValue("");
  };

  return (
    <div className="space-y-2 rounded-md border border-border/60 p-3">
      <Label>{props.label}</Label>
      <div className="flex gap-2">
        <Input
          value={draftValue}
          placeholder="Add fileId"
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addDraftValue();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addDraftValue}>
          Add
        </Button>
        <input
          id={inputId}
          type="file"
          className="hidden"
          accept={props.isImageLike ? "image/*" : undefined}
          multiple
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            if (files.length > 0) {
              void props.onUpload(props.path, files);
            }
            event.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={props.isUploading}
          onClick={() => {
            const input = document.getElementById(inputId);
            if (input instanceof HTMLInputElement) {
              input.click();
            }
          }}
        >
          {props.isUploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      {props.fileIds.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {props.fileIds.map((fileId) => {
            const publicUrl = buildPublicFileUrl(fileId);
            return (
              <div
                key={fileId}
                className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2"
              >
                {props.isImageLike ? (
                  <img
                    src={publicUrl}
                    alt={fileId}
                    className="h-24 w-full rounded-md object-cover"
                  />
                ) : null}
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline underline-offset-2 break-all"
                >
                  {fileId}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => props.onUpdate(props.fileIds.filter((item) => item !== fileId))}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No files yet.</p>
      )}
    </div>
  );
}
