import React from "react";
import { Eye, Plus, GripVertical, Copy, Trash2, Save } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Switch,
  Textarea,
} from "@corely/ui";
import type { WebsiteBlock, WebsiteBlockType } from "@corely/contracts";
import {
  WebsiteBlockEditorRegistry,
  type WebsiteBlockEditorDefinition,
  type WebsiteBlockEditorField,
} from "../blocks/website-block-editor-registry";
import { WebsitePageEditorSelectedBlockPanel } from "./website-page-editor-selected-block-panel";

type WebsitePageEditorBlocksCardProps = {
  isEdit: boolean;
  previewUrl: string | null;
  onOpenPreview: () => void;
  hasContent: boolean;
  canSaveAsPreset: boolean;
  saveAsPresetPending: boolean;
  onSaveAsPreset: () => void;
  saveDraftPending: boolean;
  onSaveDraft: () => void;
  aiBrief: string;
  setAiBrief: React.Dispatch<React.SetStateAction<string>>;
  onGenerateBlocks: () => void;
  blocks: WebsiteBlock[];
  selectedBlockId: string | null;
  setSelectedBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  setDragBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  onHandleDropBlock: (targetId: string) => void;
  onToggleBlockEnabled: (blockId: string, enabled: boolean) => void;
  onDuplicateBlock: (block: WebsiteBlock) => void;
  onRemoveBlock: (blockId: string) => void;
  template: string;
  onLoadTemplateDefaults: () => void;
  isAddBlockOpen: boolean;
  setIsAddBlockOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newBlockType: WebsiteBlockType;
  setNewBlockType: React.Dispatch<React.SetStateAction<WebsiteBlockType>>;
  addableTypes: WebsiteBlockType[];
  onAddBlock: () => void;
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

export const WebsitePageEditorBlocksCard = (props: WebsitePageEditorBlocksCardProps) => (
  <>
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold">Page blocks</h3>
            <p className="text-sm text-muted-foreground">
              Drag to reorder, toggle visibility, and edit block properties.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={!props.previewUrl} onClick={props.onOpenPreview}>
              <Eye className="h-4 w-4" />
              Preview
            </Button>
            <Button
              variant="outline"
              disabled={!props.canSaveAsPreset || props.saveAsPresetPending}
              onClick={props.onSaveAsPreset}
            >
              Save as preset
            </Button>
            <Button
              variant="accent"
              disabled={!props.isEdit || !props.hasContent || props.saveDraftPending}
              onClick={props.onSaveDraft}
            >
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border/60 p-3">
          <div className="flex-1 min-w-[220px] space-y-1">
            <Label>AI brief</Label>
            <Textarea
              rows={2}
              placeholder="Generate a conversion-focused landing page for A1 learners"
              value={props.aiBrief}
              onChange={(event) => props.setAiBrief(event.target.value)}
            />
          </div>
          <Button variant="outline" onClick={props.onGenerateBlocks}>
            Generate blocks
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <div className="space-y-3 rounded-md border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label>Blocks</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => props.setIsAddBlockOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add block
              </Button>
            </div>

            <div className="space-y-2">
              {props.blocks.map((block) => {
                const blockDef = WebsiteBlockEditorRegistry.get(block.type);
                return (
                  <div
                    key={block.id}
                    draggable
                    onDragStart={() => props.setDragBlockId(block.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => props.onHandleDropBlock(block.id)}
                    className={`rounded-md border p-2 ${
                      props.selectedBlockId === block.id ? "border-primary" : "border-border/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-muted-foreground"
                        onClick={() => props.setSelectedBlockId(block.id)}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="flex-1 text-left"
                        onClick={() => props.setSelectedBlockId(block.id)}
                      >
                        <div className="text-sm font-medium">{blockDef.displayName}</div>
                        <div className="text-xs text-muted-foreground">{block.type}</div>
                      </button>
                      <Switch
                        checked={block.enabled !== false}
                        onCheckedChange={(checked) =>
                          props.onToggleBlockEnabled(block.id, Boolean(checked))
                        }
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => props.onDuplicateBlock(block)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => props.onRemoveBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {props.blocks.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
                  No blocks loaded for this page yet.
                  {!props.isEdit ? (
                    <div className="mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={props.onLoadTemplateDefaults}
                      >
                        Load template default blocks
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-md border border-border/60 p-3">
            <WebsitePageEditorSelectedBlockPanel
              selectedBlock={props.selectedBlock}
              selectedDefinition={props.selectedDefinition}
              renderSelectedBlockPreview={props.renderSelectedBlockPreview}
              jsonFieldDrafts={props.jsonFieldDrafts}
              setJsonFieldDrafts={props.setJsonFieldDrafts}
              uploadingFieldKey={props.uploadingFieldKey}
              onUpdateSelectedBlockField={props.onUpdateSelectedBlockField}
              onCommitJsonFieldDraft={props.onCommitJsonFieldDraft}
              onUploadFilesToField={props.onUploadFilesToField}
              aiInstruction={props.aiInstruction}
              setAiInstruction={props.setAiInstruction}
              onRegenerateBlock={props.onRegenerateBlock}
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <Dialog open={props.isAddBlockOpen} onOpenChange={props.setIsAddBlockOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add block</DialogTitle>
          <DialogDescription>
            Choose a block type allowed by this template and insert it at the end of the page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Block type</Label>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={props.newBlockType}
            onChange={(event) => props.setNewBlockType(event.target.value as WebsiteBlockType)}
          >
            {props.addableTypes.map((type) => {
              const def = WebsiteBlockEditorRegistry.get(type);
              return (
                <option key={type} value={type}>
                  {def.displayName}
                </option>
              );
            })}
          </select>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => props.setIsAddBlockOpen(false)}>
              Cancel
            </Button>
            <Button onClick={props.onAddBlock}>Add</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </>
);
