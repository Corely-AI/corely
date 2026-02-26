import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Input,
  Label,
  Switch,
  Textarea,
} from "@corely/ui";
import {
  formatJson,
  type ExternalContentFieldHints,
  isRecord,
  normalizeStringArray,
  resolveExternalContentFieldKind,
  toPathStateKey,
  type ExternalContentPath,
} from "./website-site-external-content-generator";
import {
  GeneratedFileIdField,
  GeneratedFileIdListField,
} from "./website-site-editor-generated-content-media-fields";
import { WebsiteSiteEditorGeneratedContentSearchDialog } from "./website-site-editor-generated-content-search-dialog";

type WebsiteSiteEditorGeneratedContentFormProps = {
  value: Record<string, unknown>;
  schemaRootKeys: string[];
  jsonDrafts: Record<string, string>;
  setJsonDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onCommitJsonDraft: (path: ExternalContentPath) => void;
  onUpdateValue: (path: ExternalContentPath, nextValue: unknown) => void;
  uploadingPathStates: Record<string, boolean>;
  onUploadSingleFile: (path: ExternalContentPath, file: File) => Promise<void>;
  onUploadFileList: (path: ExternalContentPath, files: File[]) => Promise<void>;
  fieldHints: ExternalContentFieldHints;
};

const getOrderedKeys = (
  record: Record<string, unknown>,
  path: ExternalContentPath,
  schemaRootKeys: string[]
): string[] => {
  const keys = Object.keys(record);
  if (path.length !== 0 || schemaRootKeys.length === 0) {
    return keys;
  }

  return [
    ...schemaRootKeys.filter((key) => key in record),
    ...keys.filter((key) => !schemaRootKeys.includes(key)),
  ];
};

export function WebsiteSiteEditorGeneratedContentForm(
  props: WebsiteSiteEditorGeneratedContentFormProps
) {
  const [openRootGroups, setOpenRootGroups] = useState<string[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const createDefaultFromTemplate = (template: unknown): unknown => {
    if (Array.isArray(template)) {
      return [];
    }
    if (isRecord(template)) {
      const next: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(template)) {
        next[key] = createDefaultFromTemplate(value);
      }
      return next;
    }
    if (typeof template === "string") {
      return "";
    }
    if (typeof template === "number") {
      return 0;
    }
    if (typeof template === "boolean") {
      return false;
    }
    return "";
  };

  const getDefaultArrayItem = (items: unknown[]): unknown => {
    const sample = items.find((item) => item !== null && item !== undefined);
    return createDefaultFromTemplate(sample);
  };

  const addArrayItem = (path: ExternalContentPath, items: unknown[]) => {
    props.onUpdateValue(path, [...items, getDefaultArrayItem(items)]);
  };

  const removeArrayItem = (path: ExternalContentPath, items: unknown[], indexToRemove: number) => {
    props.onUpdateValue(
      path,
      items.filter((_, index) => index !== indexToRemove)
    );
  };

  const openSearchDialog = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearchDialog();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openSearchDialog]);

  const renderNode = (
    value: unknown,
    path: ExternalContentPath,
    label: string,
    options?: { showObjectLabel?: boolean }
  ): JSX.Element => {
    const showObjectLabel = options?.showObjectLabel ?? true;
    const fieldHint = resolveExternalContentFieldKind(path, value, props.fieldHints);
    const fieldStateKey = toPathStateKey(path);

    if (fieldHint?.fieldKind === "fileId") {
      return (
        <GeneratedFileIdField
          label={label}
          path={path}
          fileId={typeof value === "string" ? value : ""}
          isUploading={Boolean(props.uploadingPathStates[fieldStateKey])}
          isImageLike={fieldHint.isImageLike}
          onUpdate={(nextValue) => props.onUpdateValue(path, nextValue)}
          onUpload={props.onUploadSingleFile}
        />
      );
    }

    if (fieldHint?.fieldKind === "fileIdList") {
      return (
        <GeneratedFileIdListField
          label={label}
          path={path}
          fileIds={normalizeStringArray(value)}
          isUploading={Boolean(props.uploadingPathStates[fieldStateKey])}
          isImageLike={fieldHint.isImageLike}
          onUpdate={(nextValue) => props.onUpdateValue(path, nextValue)}
          onUpload={props.onUploadFileList}
        />
      );
    }

    if (isRecord(value)) {
      const orderedKeys = getOrderedKeys(value, path, props.schemaRootKeys);

      if (path.length === 0) {
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={openSearchDialog}>
                <Search className="mr-2 h-4 w-4" />
                Search fields
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={openRootGroups.length === 0}
                onClick={() => setOpenRootGroups([])}
              >
                Collapse all
              </Button>
            </div>
            <Accordion
              type="multiple"
              className="w-full space-y-2"
              value={openRootGroups}
              onValueChange={(next) => setOpenRootGroups(next)}
            >
              {orderedKeys.map((key) => (
                <AccordionItem
                  key={key}
                  value={key}
                  className="rounded-md border border-border/60 px-3"
                >
                  <AccordionTrigger className="py-2 text-sm font-medium capitalize">
                    {key}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3 pb-3">
                    {renderNode(value[key], [...path, key], key, { showObjectLabel: false })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        );
      }

      return (
        <div className="space-y-3 rounded-md border border-border/60 p-3">
          {path.length > 0 && showObjectLabel ? (
            <Label className="text-xs font-semibold uppercase">{label}</Label>
          ) : null}
          {orderedKeys.map((key) => (
            <div key={toPathStateKey([...path, key])}>
              {renderNode(value[key], [...path, key], key)}
            </div>
          ))}
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <div className="flex items-center justify-between">
            <Label>{label}</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => addArrayItem(path, value)}
            >
              Add item
            </Button>
          </div>

          {value.length === 0 ? (
            <p className="text-xs text-muted-foreground">No items yet.</p>
          ) : (
            value.map((item, index) => {
              const itemPath = [...path, index];
              const itemKey = toPathStateKey(itemPath);
              return (
                <div key={itemKey} className="space-y-2 rounded-md border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs uppercase">Item {index + 1}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeArrayItem(path, value, index)}
                    >
                      Remove
                    </Button>
                  </div>
                  {renderNode(item, itemPath, `item ${index + 1}`)}
                </div>
              );
            })
          )}
        </div>
      );
    }

    if (typeof value === "boolean") {
      return (
        <div className="flex items-center justify-between rounded-md border border-border/60 p-2">
          <Label>{label}</Label>
          <Switch
            checked={value}
            onCheckedChange={(checked) => props.onUpdateValue(path, checked)}
          />
        </div>
      );
    }

    if (typeof value === "number") {
      return (
        <div className="space-y-1">
          <Label>{label}</Label>
          <Input
            type="number"
            step="any"
            value={Number.isFinite(value) ? String(value) : ""}
            onChange={(event) => {
              const parsed = Number(event.target.value);
              if (Number.isFinite(parsed)) {
                props.onUpdateValue(path, parsed);
              }
            }}
          />
        </div>
      );
    }

    if (typeof value === "string") {
      const useTextarea = value.includes("\n") || value.length > 120;
      return (
        <div className="space-y-1">
          <Label>{label}</Label>
          {useTextarea ? (
            <Textarea
              rows={3}
              value={value}
              onChange={(event) => props.onUpdateValue(path, event.target.value)}
            />
          ) : (
            <Input
              value={value}
              onChange={(event) => props.onUpdateValue(path, event.target.value)}
            />
          )}
        </div>
      );
    }

    const stateKey = toPathStateKey(path);
    const jsonDraft = props.jsonDrafts[stateKey] ?? formatJson(value);
    return (
      <div className="space-y-1">
        <Label>{label}</Label>
        <Textarea
          rows={3}
          className="font-mono text-xs"
          value={jsonDraft}
          onChange={(event) =>
            props.setJsonDrafts((current) => ({
              ...current,
              [stateKey]: event.target.value,
            }))
          }
          onBlur={() => props.onCommitJsonDraft(path)}
        />
      </div>
    );
  };

  return (
    <>
      {renderNode(props.value, [], "siteCopy")}
      <WebsiteSiteEditorGeneratedContentSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        value={props.value}
        schemaRootKeys={props.schemaRootKeys}
        onUpdateValue={props.onUpdateValue}
        uploadingPathStates={props.uploadingPathStates}
        onUploadSingleFile={props.onUploadSingleFile}
        onUploadFileList={props.onUploadFileList}
        fieldHints={props.fieldHints}
      />
    </>
  );
}
