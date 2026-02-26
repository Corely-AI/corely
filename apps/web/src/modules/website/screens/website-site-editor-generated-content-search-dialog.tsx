import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  Label,
  Switch,
  Textarea,
} from "@corely/ui";
import {
  formatJson,
  getPathLabel,
  getValueAtPath,
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

type SearchEntry = {
  id: string;
  path: ExternalContentPath;
  pathLabel: string;
  preview: string;
  searchText: string;
};

type WebsiteSiteEditorGeneratedContentSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: Record<string, unknown>;
  schemaRootKeys: string[];
  onUpdateValue: (path: ExternalContentPath, nextValue: unknown) => void;
  uploadingPathStates: Record<string, boolean>;
  onUploadSingleFile: (path: ExternalContentPath, file: File) => Promise<void>;
  onUploadFileList: (path: ExternalContentPath, files: File[]) => Promise<void>;
  fieldHints: ExternalContentFieldHints;
};

const valuePreview = (value: unknown): string => {
  if (typeof value === "string") {
    return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `Array (${value.length})`;
  }
  if (isRecord(value)) {
    return `Object (${Object.keys(value).length} keys)`;
  }
  if (value === null) {
    return "null";
  }
  return typeof value;
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

export function WebsiteSiteEditorGeneratedContentSearchDialog(
  props: WebsiteSiteEditorGeneratedContentSearchDialogProps
) {
  const [selectedSearchId, setSelectedSearchId] = useState<string | null>(null);
  const [searchJsonDraft, setSearchJsonDraft] = useState("");
  const [searchJsonError, setSearchJsonError] = useState<string | null>(null);

  const searchEntries = useMemo(() => {
    const entries: SearchEntry[] = [];

    const walk = (node: unknown, path: ExternalContentPath) => {
      if (path.length > 0) {
        const pathLabel = getPathLabel(path);
        const preview = valuePreview(node);
        entries.push({
          id: toPathStateKey(path),
          path,
          pathLabel,
          preview,
          searchText: `${pathLabel} ${preview}`.toLowerCase(),
        });
      }

      if (isRecord(node)) {
        for (const key of getOrderedKeys(node, path, props.schemaRootKeys)) {
          walk(node[key], [...path, key]);
        }
        return;
      }

      if (Array.isArray(node)) {
        node.forEach((item, index) => walk(item, [...path, index]));
      }
    };

    walk(props.value, []);
    return entries;
  }, [props.value, props.schemaRootKeys]);

  const selectedSearchEntry = useMemo(
    () => searchEntries.find((entry) => entry.id === selectedSearchId) ?? null,
    [searchEntries, selectedSearchId]
  );

  const selectedSearchValue = useMemo(
    () => (selectedSearchEntry ? getValueAtPath(props.value, selectedSearchEntry.path) : undefined),
    [props.value, selectedSearchEntry]
  );

  useEffect(() => {
    if (!selectedSearchEntry) {
      setSearchJsonDraft("");
      setSearchJsonError(null);
      return;
    }

    if (
      isRecord(selectedSearchValue) ||
      Array.isArray(selectedSearchValue) ||
      selectedSearchValue === null ||
      typeof selectedSearchValue === "undefined"
    ) {
      setSearchJsonDraft(formatJson(selectedSearchValue));
    } else {
      setSearchJsonDraft("");
    }
    setSearchJsonError(null);
  }, [selectedSearchEntry, selectedSearchValue]);

  const applySearchJsonDraft = () => {
    if (!selectedSearchEntry) {
      return;
    }

    try {
      const parsed = JSON.parse(searchJsonDraft) as unknown;
      props.onUpdateValue(selectedSearchEntry.path, parsed);
      setSearchJsonError(null);
    } catch {
      setSearchJsonError("Invalid JSON");
    }
  };

  const closeDialog = (open: boolean) => {
    props.onOpenChange(open);
    if (!open) {
      setSelectedSearchId(null);
      setSearchJsonError(null);
    }
  };

  const renderSearchSelectedEditor = () => {
    if (!selectedSearchEntry) {
      return null;
    }

    const value = selectedSearchValue;
    const fieldHint = resolveExternalContentFieldKind(
      selectedSearchEntry.path,
      value,
      props.fieldHints
    );
    const fieldStateKey = toPathStateKey(selectedSearchEntry.path);

    if (fieldHint?.fieldKind === "fileId") {
      return (
        <div className="space-y-4 p-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSearchId(null);
                setSearchJsonError(null);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="button" size="sm" onClick={() => closeDialog(false)}>
              Done
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase">Field</Label>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              {selectedSearchEntry.pathLabel}
            </div>
          </div>

          <GeneratedFileIdField
            label="Value"
            path={selectedSearchEntry.path}
            fileId={typeof value === "string" ? value : ""}
            isUploading={Boolean(props.uploadingPathStates[fieldStateKey])}
            isImageLike={fieldHint.isImageLike}
            onUpdate={(nextValue) => props.onUpdateValue(selectedSearchEntry.path, nextValue)}
            onUpload={props.onUploadSingleFile}
          />
        </div>
      );
    }

    if (fieldHint?.fieldKind === "fileIdList") {
      return (
        <div className="space-y-4 p-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedSearchId(null);
                setSearchJsonError(null);
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="button" size="sm" onClick={() => closeDialog(false)}>
              Done
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs uppercase">Field</Label>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
              {selectedSearchEntry.pathLabel}
            </div>
          </div>

          <GeneratedFileIdListField
            label="Value"
            path={selectedSearchEntry.path}
            fileIds={normalizeStringArray(value)}
            isUploading={Boolean(props.uploadingPathStates[fieldStateKey])}
            isImageLike={fieldHint.isImageLike}
            onUpdate={(nextValue) => props.onUpdateValue(selectedSearchEntry.path, nextValue)}
            onUpload={props.onUploadFileList}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4 p-3">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedSearchId(null);
              setSearchJsonError(null);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button type="button" size="sm" onClick={() => closeDialog(false)}>
            Done
          </Button>
        </div>

        <div className="space-y-1">
          <Label className="text-xs uppercase">Field</Label>
          <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm">
            {selectedSearchEntry.pathLabel}
          </div>
        </div>

        {typeof value === "string" ? (
          <div className="space-y-1">
            <Label>Value</Label>
            {value.includes("\n") || value.length > 120 ? (
              <Textarea
                rows={6}
                value={value}
                onChange={(event) =>
                  props.onUpdateValue(selectedSearchEntry.path, event.target.value)
                }
              />
            ) : (
              <Input
                value={value}
                onChange={(event) =>
                  props.onUpdateValue(selectedSearchEntry.path, event.target.value)
                }
              />
            )}
          </div>
        ) : null}

        {typeof value === "number" ? (
          <div className="space-y-1">
            <Label>Value</Label>
            <Input
              type="number"
              step="any"
              value={Number.isFinite(value) ? String(value) : ""}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                if (Number.isFinite(parsed)) {
                  props.onUpdateValue(selectedSearchEntry.path, parsed);
                }
              }}
            />
          </div>
        ) : null}

        {typeof value === "boolean" ? (
          <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
            <Label>Value</Label>
            <Switch
              checked={value}
              onCheckedChange={(checked) => props.onUpdateValue(selectedSearchEntry.path, checked)}
            />
          </div>
        ) : null}

        {typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean" ? (
          <div className="space-y-2">
            <Label>JSON value</Label>
            <Textarea
              rows={10}
              className="font-mono text-xs"
              value={searchJsonDraft}
              onChange={(event) => {
                setSearchJsonDraft(event.target.value);
                setSearchJsonError(null);
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-destructive">{searchJsonError ?? ""}</p>
              <Button type="button" size="sm" variant="outline" onClick={applySearchJsonDraft}>
                Apply
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <CommandDialog open={props.open} onOpenChange={closeDialog} contentClassName="max-w-2xl">
      {selectedSearchEntry ? (
        renderSearchSelectedEditor()
      ) : (
        <>
          <CommandInput placeholder="Search keys or content..." />
          <CommandList>
            <CommandEmpty>No matching fields found.</CommandEmpty>
            <CommandGroup heading="Fields">
              {searchEntries.map((entry) => (
                <CommandItem
                  key={entry.id}
                  value={entry.searchText}
                  onSelect={() => setSelectedSearchId(entry.id)}
                >
                  <div className="flex w-full flex-col">
                    <span className="text-sm font-medium">{entry.pathLabel}</span>
                    <span className="text-xs text-muted-foreground">{entry.preview}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </>
      )}
    </CommandDialog>
  );
}
