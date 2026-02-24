import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { SiteCopySchema } from "@corely/contracts";
import { toast } from "sonner";
import { websiteApi } from "@/lib/website-api";

type WebsiteSiteEditorExternalContentSectionProps = {
  siteId: string;
  defaultLocale: string;
};

const toLocaleInput = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export function WebsiteSiteEditorExternalContentSection({
  siteId,
  defaultLocale,
}: WebsiteSiteEditorExternalContentSectionProps) {
  const queryClient = useQueryClient();
  const [localeInput, setLocaleInput] = useState("");
  const [jsonValue, setJsonValue] = useState("{}");
  const [isDirty, setIsDirty] = useState(false);

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
    setJsonValue(JSON.stringify(draftQuery.data.data ?? {}, null, 2));
  }, [draftQuery.data, isDirty]);

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
      toast.success("External content draft saved.");
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
      toast.success("External content published.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to publish external content.");
    },
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1">
          <h3 className="text-base font-semibold">External Content</h3>
          <p className="text-sm text-muted-foreground">
            Edit `siteCopy` JSON content only. Leave locale empty to edit the `default` content.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="site-copy-locale">Locale (optional)</Label>
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
            <Label>Key</Label>
            <Input value="siteCopy" readOnly />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="site-copy-json">siteCopy JSON</Label>
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
            ? "Loading draft..."
            : draftQuery.data
              ? `Draft updated at ${new Date(draftQuery.data.updatedAt).toLocaleString()}`
              : "No draft found yet. Save a draft to create one."}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="accent"
            disabled={saveMutation.isPending || publishMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save Draft
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={saveMutation.isPending || publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
          >
            Publish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
