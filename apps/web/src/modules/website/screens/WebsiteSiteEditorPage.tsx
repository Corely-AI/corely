import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Switch } from "@corely/ui";
import { toast } from "sonner";
import { websiteApi } from "@/lib/website-api";
import { invalidateResourceQueries } from "@/shared/crud";
import { websiteSiteKeys } from "../queries";
import { WebsiteBrandingThemeEditor } from "../components/website-branding-theme-editor";
import { getJsonFieldState } from "../components/website-branding-theme-utils";

const parseJsonInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return JSON.parse(trimmed);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

export default function WebsiteSiteEditorPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const isEdit = Boolean(siteId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: websiteSiteKeys.detail(siteId ?? ""),
    queryFn: () => (siteId ? websiteApi.getSite(siteId) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const site = data?.site;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [defaultLocale, setDefaultLocale] = useState("en-US");
  const [brandingJson, setBrandingJson] = useState("");
  const [themeJson, setThemeJson] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const brandingState = useMemo(() => getJsonFieldState(brandingJson), [brandingJson]);
  const themeState = useMemo(() => getJsonFieldState(themeJson), [themeJson]);

  useEffect(() => {
    if (!site) {
      return;
    }
    setName(site.name);
    setSlug(site.slug);
    setSlugTouched(true);
    setDefaultLocale(site.defaultLocale);
    setBrandingJson(site.brandingJson ? JSON.stringify(site.brandingJson, null, 2) : "");
    setThemeJson(site.themeJson ? JSON.stringify(site.themeJson, null, 2) : "");
    setIsDefault(site.isDefault);
  }, [site]);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmedSlug = slug.trim() || slugify(name);
      const payload = {
        name: name.trim(),
        slug: trimmedSlug,
        defaultLocale: defaultLocale.trim(),
        brandingJson: parseJsonInput(brandingJson),
        themeJson: parseJsonInput(themeJson),
        ...(isDefault ? { isDefault: true } : {}),
      };

      if (isEdit && siteId) {
        return websiteApi.updateSite(siteId, payload);
      }
      return websiteApi.createSite(payload);
    },
    onSuccess: () => {
      void invalidateResourceQueries(queryClient, "website-sites");
      toast.success(isEdit ? "Site updated" : "Site created");
      navigate("/website/sites");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save site");
    },
  });

  const canSave = useMemo(
    () =>
      name.trim().length > 0 &&
      slug.trim().length > 0 &&
      defaultLocale.trim().length > 0 &&
      !brandingState.error &&
      !themeState.error,
    [name, slug, defaultLocale, brandingState.error, themeState.error]
  );

  const handleSave = () => {
    if (brandingState.error || themeState.error) {
      toast.error("Fix invalid JSON before saving.");
      return;
    }
    void mutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-lg font-semibold">{isEdit ? "Edit site" : "Create site"}</div>
            <div className="text-sm text-muted-foreground">Define core website settings</div>
          </div>
        </div>
        <Button variant="accent" disabled={!canSave || mutation.isPending} onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Site name</Label>
              <Input
                value={name}
                onChange={(event) => {
                  const value = event.target.value;
                  setName(value);
                  if (!slugTouched) {
                    setSlug(slugify(value));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Site slug</Label>
              <Input
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value);
                  setSlugTouched(true);
                }}
                placeholder="my-site"
              />
              <p className="text-xs text-muted-foreground">
                Used in public URLs. Only lowercase letters, numbers, and dashes.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Default locale</Label>
              <Input
                value={defaultLocale}
                onChange={(event) => setDefaultLocale(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-4 py-3">
            <div>
              <Label>Default site</Label>
              <p className="text-sm text-muted-foreground">
                Use this site when no website slug is provided in the URL.
              </p>
            </div>
            <Switch
              checked={isDefault}
              disabled={Boolean(site?.isDefault)}
              onCheckedChange={(checked) => setIsDefault(Boolean(checked))}
            />
          </div>

          <WebsiteBrandingThemeEditor
            brandingJson={brandingJson}
            brandingState={brandingState}
            themeJson={themeJson}
            themeState={themeState}
            onBrandingChange={setBrandingJson}
            onThemeChange={setThemeJson}
          />
        </CardContent>
      </Card>
    </div>
  );
}
