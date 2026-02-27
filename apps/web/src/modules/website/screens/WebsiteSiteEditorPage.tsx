import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@corely/ui";
import {
  WebsiteSiteCommonSettingsSchema,
  WebsiteSiteThemeSettingsSchema,
  type WebsiteSiteCommonSettings,
  type WebsiteSiteThemeSettings,
} from "@corely/contracts";
import { toast } from "sonner";
import { cmsApi } from "@/lib/cms-api";
import { websiteApi } from "@/lib/website-api";
import { invalidateResourceQueries } from "@/shared/crud";
import { websiteSiteKeys } from "../queries";
import { getJsonFieldState } from "../components/website-branding-theme-utils";
import { WebsiteSiteEditorAdvancedJsonSection } from "./website-site-editor-advanced-json-section";
import { WebsiteSiteEditorBrandingSection } from "./website-site-editor-branding-section";
import { WebsiteSiteEditorCustomPropertiesSection } from "./website-site-editor-custom-properties-section";
import { WebsiteSiteEditorDetailsSection } from "./website-site-editor-details-section";
import { WebsiteSiteEditorExternalContentSection } from "./website-site-editor-external-content-section";
import { WebsiteSiteEditorThemeTokensSection } from "./website-site-editor-theme-tokens-section";
import {
  DEFAULT_COMMON_SETTINGS,
  DEFAULT_THEME_SETTINGS,
  normalizeCommonSettings,
  normalizeThemeSettings,
  parseCustomRows,
  sanitizeCommonSettingsForSave,
  sanitizeThemeSettingsForSave,
  slugify,
  toCustomRows,
  type CustomPropertyRow,
} from "./website-site-editor-utils";

export default function WebsiteSiteEditorPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const isEdit = Boolean(siteId);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

  const { data } = useQuery({
    queryKey: websiteSiteKeys.detail(siteId ?? ""),
    queryFn: () => (siteId ? websiteApi.getSite(siteId) : Promise.resolve(null)),
    enabled: isEdit,
  });

  const site = data?.site;
  const requestedTab = searchParams.get("tab");
  const activeTab = isEdit && requestedTab === "external-content" ? "external-content" : "settings";

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [defaultLocale, setDefaultLocale] = useState("en-US");
  const [isDefault, setIsDefault] = useState(false);
  const [common, setCommon] = useState<WebsiteSiteCommonSettings>(() => DEFAULT_COMMON_SETTINGS);
  const [theme, setTheme] = useState<WebsiteSiteThemeSettings>(() => DEFAULT_THEME_SETTINGS);
  const [customRows, setCustomRows] = useState<CustomPropertyRow[]>([]);
  const [customRowErrors, setCustomRowErrors] = useState<Record<string, string>>({});

  const [commonJson, setCommonJson] = useState(() =>
    JSON.stringify(DEFAULT_COMMON_SETTINGS, null, 2)
  );
  const [themeJson, setThemeJson] = useState(() => JSON.stringify(DEFAULT_THEME_SETTINGS, null, 2));

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  const commonJsonState = useMemo(() => getJsonFieldState(commonJson), [commonJson]);
  const themeJsonState = useMemo(() => getJsonFieldState(themeJson), [themeJson]);

  const syncCommon = (next: WebsiteSiteCommonSettings) => {
    setCommon(next);
    setCommonJson(JSON.stringify(next, null, 2));
  };

  const syncTheme = (next: WebsiteSiteThemeSettings) => {
    setTheme(next);
    setThemeJson(JSON.stringify(next, null, 2));
  };

  useEffect(() => {
    if (!site) {
      return;
    }

    const normalizedCommon = normalizeCommonSettings(
      site.settings?.common ?? site.brandingJson,
      site.name
    );
    const normalizedTheme = normalizeThemeSettings(site.settings?.theme ?? site.themeJson);

    setName(site.name);
    setSlug(site.slug);
    setSlugTouched(true);
    setDefaultLocale(site.defaultLocale);
    setIsDefault(site.isDefault);

    setCommon(normalizedCommon);
    setTheme(normalizedTheme);
    setCommonJson(JSON.stringify(normalizedCommon, null, 2));
    setThemeJson(JSON.stringify(normalizedTheme, null, 2));
    setCustomRows(toCustomRows(site.settings?.custom ?? {}));
    setCustomRowErrors({});
  }, [site]);

  const mutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      slug: string;
      defaultLocale: string;
      common: WebsiteSiteCommonSettings;
      theme: WebsiteSiteThemeSettings;
      custom: Record<string, unknown>;
      isDefault?: boolean;
    }) => {
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
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Failed to save site";
      toast.error(message);
    },
  });

  const uploadAsset = async (kind: "logo" | "favicon", files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    if (kind === "logo") {
      setIsUploadingLogo(true);
    } else {
      setIsUploadingFavicon(true);
    }

    try {
      const uploaded = await cmsApi.uploadCmsAsset(file, {
        purpose: "website-branding",
        category: "website",
      });

      if (kind === "logo") {
        syncCommon({
          ...common,
          logo: {
            ...common.logo,
            fileId: uploaded.fileId,
            url: uploaded.url,
          },
        });
      } else {
        syncCommon({
          ...common,
          favicon: {
            ...common.favicon,
            fileId: uploaded.fileId,
            url: uploaded.url,
          },
        });
      }

      toast.success(`${kind === "logo" ? "Logo" : "Favicon"} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      if (kind === "logo") {
        setIsUploadingLogo(false);
      } else {
        setIsUploadingFavicon(false);
      }
    }
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim() || slugify(trimmedName);

    if (!trimmedName || !trimmedSlug || !defaultLocale.trim()) {
      toast.error("Name, slug, and default locale are required.");
      return;
    }

    const customResult = parseCustomRows(customRows);
    setCustomRowErrors(customResult.rowErrors);

    if (Object.keys(customResult.rowErrors).length > 0) {
      toast.error("Fix custom property errors before saving.");
      return;
    }

    if (!customResult.custom) {
      toast.error(customResult.customError || "Invalid custom properties.");
      return;
    }

    const parsedCommon = WebsiteSiteCommonSettingsSchema.safeParse(
      sanitizeCommonSettingsForSave(common)
    );
    if (!parsedCommon.success) {
      toast.error(parsedCommon.error.issues[0]?.message || "Invalid common settings.");
      return;
    }

    const parsedTheme = WebsiteSiteThemeSettingsSchema.safeParse(
      sanitizeThemeSettingsForSave(theme)
    );
    if (!parsedTheme.success) {
      toast.error(parsedTheme.error.issues[0]?.message || "Invalid theme settings.");
      return;
    }

    void mutation.mutate({
      name: trimmedName,
      slug: trimmedSlug,
      defaultLocale: defaultLocale.trim(),
      common: parsedCommon.data,
      theme: parsedTheme.data,
      custom: customResult.custom,
      ...(isDefault ? { isDefault: true } : {}),
    });
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }

    if (!isEdit) {
      const trimmed = value.trim();
      if (!common.siteTitle || common.siteTitle === "Website") {
        syncCommon({
          ...common,
          siteTitle: trimmed || "Website",
        });
      }
    }
  };

  const handleApplyCommonJson = () => {
    if (commonJsonState.status === "invalid") {
      toast.error("Common JSON is invalid.");
      return;
    }

    const parsed = WebsiteSiteCommonSettingsSchema.safeParse(commonJsonState.parsed);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Common JSON is invalid.");
      return;
    }

    syncCommon(parsed.data);
    toast.success("Applied common JSON.");
  };

  const handleApplyThemeJson = () => {
    if (themeJsonState.status === "invalid") {
      toast.error("Theme JSON is invalid.");
      return;
    }

    const parsed = WebsiteSiteThemeSettingsSchema.safeParse(themeJsonState.parsed);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Theme JSON is invalid.");
      return;
    }

    syncTheme(parsed.data);
    toast.success("Applied theme JSON.");
  };

  const canSave =
    name.trim().length > 0 &&
    slug.trim().length > 0 &&
    defaultLocale.trim().length > 0 &&
    !mutation.isPending;

  const handleTabChange = (value: string) => {
    if (!isEdit) {
      return;
    }

    if (value === "external-content") {
      setSearchParams({ tab: "external-content" }, { replace: true });
      return;
    }

    setSearchParams({}, { replace: true });
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-lg font-semibold">{isEdit ? "Edit site" : "Create site"}</div>
            <div className="text-sm text-muted-foreground">
              Manage website branding and settings
            </div>
          </div>
        </div>
        {activeTab === "settings" ? (
          <Button variant="accent" disabled={!canSave} onClick={handleSave}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {isEdit ? (
          <TabsList>
            <TabsTrigger value="settings">Site Settings</TabsTrigger>
            <TabsTrigger value="external-content">External Content</TabsTrigger>
          </TabsList>
        ) : null}

        <TabsContent value="settings">
          <Card>
            <CardContent className="space-y-6 p-6">
              <WebsiteSiteEditorDetailsSection
                name={name}
                slug={slug}
                defaultLocale={defaultLocale}
                isDefault={isDefault}
                isLockedDefault={Boolean(site?.isDefault)}
                onNameChange={handleNameChange}
                onSlugChange={(value) => {
                  setSlug(value);
                  setSlugTouched(true);
                }}
                onDefaultLocaleChange={setDefaultLocale}
                onIsDefaultChange={setIsDefault}
              />

              <div className="space-y-4 rounded-lg border border-border/60 p-4">
                <WebsiteSiteEditorBrandingSection
                  common={common}
                  syncCommon={syncCommon}
                  logoInputRef={logoInputRef}
                  faviconInputRef={faviconInputRef}
                  isUploadingLogo={isUploadingLogo}
                  isUploadingFavicon={isUploadingFavicon}
                  onUploadAsset={(kind, files) => {
                    void uploadAsset(kind, files);
                  }}
                />
                <WebsiteSiteEditorThemeTokensSection theme={theme} syncTheme={syncTheme} />
              </div>

              <WebsiteSiteEditorCustomPropertiesSection
                customRows={customRows}
                customRowErrors={customRowErrors}
                setCustomRows={setCustomRows}
                setCustomRowErrors={setCustomRowErrors}
              />

              <WebsiteSiteEditorAdvancedJsonSection
                commonJson={commonJson}
                themeJson={themeJson}
                commonJsonError={commonJsonState.error}
                themeJsonError={themeJsonState.error}
                onCommonJsonChange={setCommonJson}
                onThemeJsonChange={setThemeJson}
                onApplyCommonJson={handleApplyCommonJson}
                onApplyThemeJson={handleApplyThemeJson}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isEdit && siteId ? (
          <TabsContent value="external-content">
            <WebsiteSiteEditorExternalContentSection
              siteId={siteId}
              defaultLocale={defaultLocale}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
