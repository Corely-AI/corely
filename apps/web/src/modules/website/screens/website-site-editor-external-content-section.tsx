import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { SiteCopySchema } from "@corely/contracts";
import { toast } from "sonner";
import { cmsApi } from "@/lib/cms-api";
import { websiteApi } from "@/lib/website-api";
import { WebsiteSiteEditorGeneratedContentForm } from "./website-site-editor-generated-content-form";
import {
  cloneJsonValue,
  extractSchemaRootKeys,
  formatJson,
  getValueAtPath,
  isRecord,
  type ExternalContentFieldHints,
  normalizeStringArray,
  orderRootKeys,
  parseDefaultObjectFromSource,
  setValueAtPath,
  toPathStateKey,
  type ExternalContentPath,
} from "./website-site-external-content-generator";
import { extractSchemaFieldHints } from "./website-site-external-content-schema-hints";

type WebsiteSiteEditorExternalContentSectionProps = {
  siteId: string;
  defaultLocale: string;
};

const toLocaleInput = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const mergeTemplateWithCurrent = (template: unknown, current: unknown): unknown => {
  if (Array.isArray(template)) {
    if (Array.isArray(current) && current.length > 0) {
      return current;
    }
    return template;
  }

  if (isRecord(template)) {
    const templateKeys = Object.keys(template);
    const currentRecord = isRecord(current) ? current : {};
    const next: Record<string, unknown> = {};

    for (const key of templateKeys) {
      next[key] = mergeTemplateWithCurrent(template[key], currentRecord[key]);
    }

    for (const [key, value] of Object.entries(currentRecord)) {
      if (!(key in next)) {
        next[key] = value;
      }
    }

    return next;
  }

  return current === undefined ? template : current;
};

export function WebsiteSiteEditorExternalContentSection({
  siteId,
  defaultLocale,
}: WebsiteSiteEditorExternalContentSectionProps) {
  const uiCopy = useUiCopy("ui.website-website-site-editor-external-content-section");
  const queryClient = useQueryClient();
  const [localeInput, setLocaleInput] = useState("");
  const [jsonValue, setJsonValue] = useState("{}");
  const [isDirty, setIsDirty] = useState(false);

  const [schemaSource, setSchemaSource] = useState("");
  const [defaultSource, setDefaultSource] = useState("");
  const [schemaRootKeys, setSchemaRootKeys] = useState<string[]>([]);
  const [generatedEditorValue, setGeneratedEditorValue] = useState<Record<string, unknown> | null>(
    null
  );
  const [generatedJsonDrafts, setGeneratedJsonDrafts] = useState<Record<string, string>>({});
  const [uploadingPathStates, setUploadingPathStates] = useState<Record<string, boolean>>({});
  const [schemaFieldHints, setSchemaFieldHints] = useState<ExternalContentFieldHints>({});

  const locale = useMemo(() => toLocaleInput(localeInput), [localeInput]);
  const queryKey = useMemo(
    () => ["website-external-content-draft", siteId, "siteCopy", locale ?? "default"],
    [siteId, locale]
  );

  const draftQuery = useQuery({
    queryKey,
    queryFn: () =>
      websiteApi.getExternalContentDraft(siteId, {
        key: "siteCopy",
        locale,
      }),
  });

  useEffect(() => {
    if (!draftQuery.data || isDirty) {
      return;
    }

    const nextValue = isRecord(draftQuery.data.data) ? draftQuery.data.data : {};
    setJsonValue(formatJson(nextValue));
    setGeneratedEditorValue(cloneJsonValue(nextValue));
    setGeneratedJsonDrafts({});
    setSchemaRootKeys([]);
    setUploadingPathStates({});
    setSchemaFieldHints({});
  }, [draftQuery.data, isDirty]);

  const updateGeneratedValue = (path: ExternalContentPath, nextValue: unknown) => {
    setGeneratedEditorValue((current) => {
      if (!current) {
        return current;
      }

      const next = setValueAtPath(current, path, nextValue);
      if (!isRecord(next)) {
        return current;
      }

      setJsonValue(formatJson(next));
      setIsDirty(true);
      return next;
    });
  };

  const commitGeneratedJsonDraft = (path: ExternalContentPath) => {
    const stateKey = toPathStateKey(path);
    const draft = generatedJsonDrafts[stateKey];
    if (draft === undefined) {
      return;
    }

    try {
      const parsed = JSON.parse(draft) as unknown;
      updateGeneratedValue(path, parsed);
      setGeneratedJsonDrafts((current) => {
        const next = { ...current };
        delete next[stateKey];
        return next;
      });
    } catch {
      toast.error(uiCopy("invalid-json-for-this"));
    }
  };

  const setPathUploading = (path: ExternalContentPath, isUploading: boolean) => {
    const key = toPathStateKey(path);
    setUploadingPathStates((current) => {
      if (isUploading) {
        return { ...current, [key]: true };
      }
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const uploadSingleFileToPath = async (path: ExternalContentPath, file: File) => {
    setPathUploading(path, true);
    try {
      const uploaded = await cmsApi.uploadCmsAsset(file, {
        purpose: "website-external-content",
        category: "website",
      });
      updateGeneratedValue(path, uploaded.fileId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload file.");
    } finally {
      setPathUploading(path, false);
    }
  };

  const uploadFileListToPath = async (path: ExternalContentPath, files: File[]) => {
    if (files.length === 0) {
      return;
    }

    setPathUploading(path, true);
    try {
      const uploadedResults = await Promise.all(
        files.map((file) =>
          cmsApi.uploadCmsAsset(file, {
            purpose: "website-external-content",
            category: "website",
          })
        )
      );
      const uploadedIds = uploadedResults.map((item) => item.fileId);
      const currentFileIds = normalizeStringArray(getValueAtPath(generatedEditorValue, path));
      const merged = Array.from(new Set([...currentFileIds, ...uploadedIds]));
      updateGeneratedValue(path, merged);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload files.");
    } finally {
      setPathUploading(path, false);
    }
  };

  const handleGenerateEditor = () => {
    let currentSiteCopyRecord: Record<string, unknown> = {};
    try {
      const parsedCurrent = JSON.parse(jsonValue) as unknown;
      if (isRecord(parsedCurrent)) {
        currentSiteCopyRecord = parsedCurrent;
      }
    } catch {
      currentSiteCopyRecord = {};
    }

    let baseValue: unknown;
    try {
      if (defaultSource.trim().length > 0) {
        const templateValue = parseDefaultObjectFromSource(defaultSource, {
          fallbackRecord: currentSiteCopyRecord,
        });
        baseValue = mergeTemplateWithCurrent(templateValue, currentSiteCopyRecord);
      } else {
        baseValue = currentSiteCopyRecord;
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to parse siteCopy.default.ts input or current JSON."
      );
      return;
    }

    if (!isRecord(baseValue)) {
      toast.error(uiCopy("generated-value-must-be"));
      return;
    }

    const validated = SiteCopySchema.safeParse(baseValue);
    if (!validated.success) {
      toast.error(validated.error.issues[0]?.message || "siteCopy.default.ts validation failed.");
      return;
    }

    let nextSchemaRootKeys: string[] = [];
    let nextSchemaFieldHints: ExternalContentFieldHints = {};
    if (schemaSource.trim().length > 0) {
      nextSchemaRootKeys = extractSchemaRootKeys(schemaSource);
      nextSchemaFieldHints = extractSchemaFieldHints(schemaSource);
      if (nextSchemaRootKeys.length === 0) {
        toast.error(uiCopy("could-not-parse-keys"));
      }
    }

    const nextValue = orderRootKeys(validated.data as Record<string, unknown>, nextSchemaRootKeys);

    setSchemaRootKeys(nextSchemaRootKeys);
    setSchemaFieldHints(nextSchemaFieldHints);
    setGeneratedEditorValue(cloneJsonValue(nextValue));
    setGeneratedJsonDrafts({});
    setUploadingPathStates({});
    setJsonValue(formatJson(nextValue));
    setIsDirty(true);
    toast.success(uiCopy("generated-external-content-editor"));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(jsonValue);
      } catch {
        throw new Error("Draft JSON is invalid.");
      }

      const parsedCopy = SiteCopySchema.safeParse(parsedJson);
      if (!parsedCopy.success) {
        throw new Error(
          parsedCopy.error.issues[0]?.message || "siteCopy schema validation failed."
        );
      }

      return websiteApi.patchExternalContentDraft(siteId, {
        key: "siteCopy",
        locale,
        data: parsedCopy.data,
      });
    },
    onSuccess: async () => {
      setIsDirty(false);
      await queryClient.invalidateQueries({ queryKey });
      toast.success(uiCopy("external-content-draft-saved"));
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save external content.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () =>
      websiteApi.publishExternalContent(siteId, {
        key: "siteCopy",
        locale,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      toast.success(uiCopy("external-content-published"));
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to publish external content.");
    },
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{uiCopy("external-content")}</h3>
          <p className="text-sm text-muted-foreground">{uiCopy("paste-sitecopy-schema-ts")}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="site-copy-locale">{uiCopy("locale-optional")}</Label>
            <Input
              id="site-copy-locale"
              placeholder={defaultLocale}
              value={localeInput}
              onChange={(event) => {
                setLocaleInput(event.target.value);
                setIsDirty(false);
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>{uiCopy("key")}</Label>
            <Input value="siteCopy" readOnly />
          </div>
        </div>

        <div className="space-y-3 rounded-md border border-border/60 p-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">{uiCopy("generate-editor")}</h4>
            <p className="text-xs text-muted-foreground">{uiCopy("paste-source-from-sitecopy")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-copy-schema-source">{uiCopy("sitecopy-schema-ts")}</Label>
            <Textarea
              id="site-copy-schema-source"
              rows={6}
              className="font-mono text-xs"
              value={schemaSource}
              placeholder={uiCopy("export-const-sitecopyschema-z")}
              onChange={(event) => setSchemaSource(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="site-copy-default-source">{uiCopy("sitecopy-default-ts")}</Label>
            <Textarea
              id="site-copy-default-source"
              rows={8}
              className="font-mono text-xs"
              value={defaultSource}
              placeholder={uiCopy("export-const-sitecopydefault")}
              onChange={(event) => setDefaultSource(event.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={saveMutation.isPending || publishMutation.isPending}
              onClick={handleGenerateEditor}
            >
              {uiCopy("generate-editor")}
            </Button>
          </div>
        </div>

        {generatedEditorValue ? (
          <div className="space-y-3 rounded-md border border-border/60 p-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">{uiCopy("generated-content-editor")}</h4>
              <p className="text-xs text-muted-foreground">
                {uiCopy("changes-here-automatically-update")}
              </p>
            </div>
            <WebsiteSiteEditorGeneratedContentForm
              value={generatedEditorValue}
              schemaRootKeys={schemaRootKeys}
              jsonDrafts={generatedJsonDrafts}
              setJsonDrafts={setGeneratedJsonDrafts}
              onCommitJsonDraft={commitGeneratedJsonDraft}
              onUpdateValue={updateGeneratedValue}
              uploadingPathStates={uploadingPathStates}
              onUploadSingleFile={uploadSingleFileToPath}
              onUploadFileList={uploadFileListToPath}
              fieldHints={schemaFieldHints}
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="site-copy-json">{uiCopy("sitecopy-json")}</Label>
          <Textarea
            id="site-copy-json"
            rows={18}
            className="font-mono text-xs"
            value={jsonValue}
            onChange={(event) => {
              setJsonValue(event.target.value);
              setIsDirty(true);
            }}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {draftQuery.isLoading
            ? uiCopy("loading-draft")
            : draftQuery.data
              ? `Draft updated at ${new Date(draftQuery.data.updatedAt).toLocaleString()}`
              : uiCopy("no-draft-found-yet")}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="accent"
            disabled={saveMutation.isPending || publishMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {uiCopy("save-draft")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saveMutation.isPending || publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
          >
            {uiCopy("publish")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
