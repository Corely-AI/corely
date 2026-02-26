import React from "react";
import { Badge, Button, Input, Label, Switch, Textarea } from "@corely/ui";
import type { WebsiteBlock } from "@corely/contracts";
import { buildPublicFileUrl } from "@/lib/cms-api";
import type {
  WebsiteBlockEditorDefinition,
  WebsiteBlockEditorField,
} from "../blocks/website-block-editor-registry";
import {
  getValueAtPath,
  normalizeFileIdList,
  stringifyJsonField,
} from "./website-page-editor.utils";

type WebsitePageEditorSelectedBlockPanelProps = {
  selectedBlock: WebsiteBlock | null;
  selectedDefinition: WebsiteBlockEditorDefinition | null;
  renderSelectedBlockPreview: () => React.ReactNode;
  jsonFieldDrafts: Record<string, string>;
  setJsonFieldDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  uploadingFieldKey: string | null;
  onUpdateSelectedBlockField: (field: WebsiteBlockEditorField, value: unknown) => void;
  onCommitJsonFieldDraft: (field: WebsiteBlockEditorField) => void;
  onUploadFilesToField: (field: WebsiteBlockEditorField, files: FileList | null) => Promise<void>;
  aiInstruction: string;
  setAiInstruction: React.Dispatch<React.SetStateAction<string>>;
  onRegenerateBlock: () => void;
};

export const WebsitePageEditorSelectedBlockPanel = (
  props: WebsitePageEditorSelectedBlockPanelProps
) => {
  const selectedBlock = props.selectedBlock;
  const selectedDefinition = props.selectedDefinition;

  if (!selectedBlock) {
    return <p className="text-sm text-muted-foreground">Select a block to edit its properties.</p>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">
            {selectedDefinition?.displayName ?? selectedBlock.type}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedDefinition?.description ??
              "No field editor is registered for this block type."}
          </p>
        </div>
        <Badge variant={selectedBlock.enabled === false ? "warning" : "success"}>
          {selectedBlock.enabled === false ? "Disabled" : "Enabled"}
        </Badge>
      </div>

      <div className="space-y-2 rounded-md border border-border/60 p-3">
        <Label>Component review</Label>
        <div className="overflow-hidden rounded-md border border-border/60">
          {props.renderSelectedBlockPreview()}
        </div>
      </div>

      {selectedDefinition ? (
        <div className="space-y-2">
          {selectedDefinition.fields.map((field) => {
            const rawValue = getValueAtPath(selectedBlock.props, field.key);
            const boolValue = Boolean(rawValue);
            const textValue = typeof rawValue === "string" ? rawValue : "";
            const stateKey = `${selectedBlock.id}:${field.key}`;
            const isUploading = props.uploadingFieldKey === stateKey;

            if (field.type === "boolean") {
              return (
                <div
                  key={field.key}
                  className="flex items-center justify-between rounded-md border border-border/60 p-2"
                >
                  <Label>{field.label}</Label>
                  <Switch
                    checked={boolValue}
                    onCheckedChange={(checked) => props.onUpdateSelectedBlockField(field, checked)}
                  />
                </div>
              );
            }

            if (field.type === "json") {
              const jsonValue = props.jsonFieldDrafts[stateKey] ?? stringifyJsonField(rawValue);
              return (
                <div key={field.key} className="space-y-1">
                  <Label>{field.label}</Label>
                  <Textarea
                    rows={6}
                    className="font-mono text-xs"
                    value={jsonValue}
                    onChange={(event) =>
                      props.setJsonFieldDrafts((current) => ({
                        ...current,
                        [stateKey]: event.target.value,
                      }))
                    }
                    onBlur={() => props.onCommitJsonFieldDraft(field)}
                  />
                  <p className="text-xs text-muted-foreground">JSON value is applied on blur.</p>
                </div>
              );
            }

            if (field.type === "fileId") {
              const inputId = `file-upload-${selectedBlock.id}-${field.key}`;
              const imageUrl = textValue ? buildPublicFileUrl(textValue) : null;
              return (
                <div key={field.key} className="space-y-2 rounded-md border border-border/60 p-3">
                  <Label>{field.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={textValue}
                      placeholder="file_xxx"
                      onChange={(event) =>
                        props.onUpdateSelectedBlockField(
                          field,
                          event.target.value.trim() || undefined
                        )
                      }
                    />
                    <input
                      id={inputId}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(event) => {
                        const files = event.target.files;
                        void props.onUploadFilesToField(field, files);
                        event.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                      onClick={() => {
                        const input = document.getElementById(inputId);
                        if (input instanceof HTMLInputElement) {
                          input.click();
                        }
                      }}
                    >
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={textValue}
                      className="h-24 w-24 rounded-md border border-border/60 object-cover"
                    />
                  ) : null}
                </div>
              );
            }

            if (field.type === "fileIdList") {
              const inputId = `file-list-upload-${selectedBlock.id}-${field.key}`;
              const fileIds = normalizeFileIdList(rawValue);
              return (
                <div key={field.key} className="space-y-2 rounded-md border border-border/60 p-3">
                  <Label>{field.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add fileId and press Enter"
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") {
                          return;
                        }
                        event.preventDefault();
                        const value = event.currentTarget.value.trim();
                        if (!value) {
                          return;
                        }
                        const merged = Array.from(new Set([...fileIds, value]));
                        props.onUpdateSelectedBlockField(field, merged);
                        event.currentTarget.value = "";
                      }}
                    />
                    <input
                      id={inputId}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        const files = event.target.files;
                        void props.onUploadFilesToField(field, files);
                        event.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                      onClick={() => {
                        const input = document.getElementById(inputId);
                        if (input instanceof HTMLInputElement) {
                          input.click();
                        }
                      }}
                    >
                      {isUploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {fileIds.map((fileId) => (
                      <div
                        key={fileId}
                        className="rounded-md border border-border/60 p-2 space-y-2"
                      >
                        <img
                          src={buildPublicFileUrl(fileId)}
                          alt={fileId}
                          className="h-24 w-full rounded-md object-cover"
                        />
                        <div className="text-xs text-muted-foreground break-all">{fileId}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const next = fileIds.filter((item) => item !== fileId);
                            props.onUpdateSelectedBlockField(field, next);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <div key={field.key} className="space-y-1">
                <Label>{field.label}</Label>
                {field.type === "textarea" ? (
                  <Textarea
                    rows={3}
                    value={textValue}
                    onChange={(event) =>
                      props.onUpdateSelectedBlockField(field, event.target.value || undefined)
                    }
                  />
                ) : (
                  <Input
                    value={textValue}
                    onChange={(event) =>
                      props.onUpdateSelectedBlockField(field, event.target.value || undefined)
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No editor fields registered for this block type.
        </p>
      )}

      {selectedDefinition ? (
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Label>AI instruction</Label>
          <Textarea
            rows={2}
            placeholder="Disable this block on mobile"
            value={props.aiInstruction}
            onChange={(event) => props.setAiInstruction(event.target.value)}
          />
          <Button variant="outline" onClick={props.onRegenerateBlock}>
            Regenerate selected block
          </Button>
        </div>
      ) : null}
    </>
  );
};
