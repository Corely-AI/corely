import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Save, Trash2, UploadCloud } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Switch,
  Textarea,
} from "@corely/ui";
import {
  WebsiteSiteCommonSettingsSchema,
  WebsiteSiteCustomSettingsSchema,
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

const CUSTOM_KEY_REGEX = /^[a-z][a-z0-9._-]*$/;
const DEFAULT_COMMON_SETTINGS = WebsiteSiteCommonSettingsSchema.parse({ siteTitle: "Website" });
const DEFAULT_THEME_SETTINGS = WebsiteSiteThemeSettingsSchema.parse({});
const CTA_VARIANTS = ["primary", "secondary", "outline", "ghost"] as const;

const normalizeCtaVariant = (
  value: string | undefined
): (typeof CTA_VARIANTS)[number] | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  return CTA_VARIANTS.find((variant) => variant === normalized);
};

const createRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 80);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeCommonSettings = (
  value: unknown,
  fallbackSiteTitle: string
): WebsiteSiteCommonSettings => {
  const siteTitle = fallbackSiteTitle.trim() || "Website";
  if (!isPlainObject(value)) {
    return WebsiteSiteCommonSettingsSchema.parse({ siteTitle });
  }

  const candidate = {
    ...value,
    siteTitle:
      typeof value.siteTitle === "string" && value.siteTitle.trim().length > 0
        ? value.siteTitle
        : siteTitle,
  };
  const parsed = WebsiteSiteCommonSettingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : WebsiteSiteCommonSettingsSchema.parse({ siteTitle });
};

const normalizeThemeSettings = (value: unknown): WebsiteSiteThemeSettings => {
  const parsed = WebsiteSiteThemeSettingsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : WebsiteSiteThemeSettingsSchema.parse({});
};

type CustomPropertyRow = {
  id: string;
  key: string;
  valueText: string;
};

const toCustomRows = (value: unknown): CustomPropertyRow[] => {
  if (!isPlainObject(value)) {
    return [];
  }

  return Object.entries(value).map(([key, item]) => ({
    id: createRowId(),
    key,
    valueText: JSON.stringify(item, null, 2),
  }));
};

const parseCustomRows = (rows: CustomPropertyRow[]) => {
  const rowErrors: Record<string, string> = {};
  const custom: Record<string, unknown> = {};
  const usedKeys = new Set<string>();

  for (const row of rows) {
    const key = row.key.trim();
    const valueText = row.valueText.trim();

    if (!key && !valueText) {
      continue;
    }

    if (!key) {
      rowErrors[row.id] = "Key is required.";
      continue;
    }

    if (!CUSTOM_KEY_REGEX.test(key)) {
      rowErrors[row.id] = "Key must be slug-like (letters, numbers, dot, underscore, dash).";
      continue;
    }

    if (usedKeys.has(key)) {
      rowErrors[row.id] = "Duplicate key.";
      continue;
    }

    if (!valueText) {
      rowErrors[row.id] = "JSON value is required.";
      continue;
    }

    try {
      custom[key] = JSON.parse(valueText);
    } catch {
      rowErrors[row.id] = "Invalid JSON value.";
      continue;
    }

    usedKeys.add(key);
  }

  const customValidation = WebsiteSiteCustomSettingsSchema.safeParse(custom);
  return {
    rowErrors,
    custom: customValidation.success ? customValidation.data : null,
    customError: customValidation.success ? null : customValidation.error.issues[0]?.message,
  };
};

const sanitizeCommonSettingsForSave = (
  value: WebsiteSiteCommonSettings
): WebsiteSiteCommonSettings => {
  const ctaLabel = value.header?.cta?.label?.trim() ?? "";
  const ctaHref = value.header?.cta?.href?.trim() ?? "";
  const hasCta = ctaLabel.length > 0 && ctaHref.length > 0;

  const footerLinks = (value.footer?.links ?? [])
    .map((link) => ({
      label: link.label.trim(),
      href: link.href.trim(),
    }))
    .filter((link) => link.label.length > 0 && link.href.length > 0);

  return {
    ...value,
    siteTitle: value.siteTitle.trim(),
    siteSubtitle: value.siteSubtitle?.trim() || undefined,
    header: {
      ...value.header,
      showLogo: value.header?.showLogo ?? true,
      cta: hasCta
        ? {
            ...value.header?.cta,
            label: ctaLabel,
            href: ctaHref,
            variant: normalizeCtaVariant(value.header?.cta?.variant),
          }
        : undefined,
    },
    footer: {
      ...value.footer,
      copyrightText: value.footer?.copyrightText?.trim() || undefined,
      links: footerLinks,
    },
    socials: {
      youtube: value.socials?.youtube?.trim() || undefined,
      instagram: value.socials?.instagram?.trim() || undefined,
      tiktok: value.socials?.tiktok?.trim() || undefined,
      x: value.socials?.x?.trim() || undefined,
      linkedin: value.socials?.linkedin?.trim() || undefined,
      facebook: value.socials?.facebook?.trim() || undefined,
      email: value.socials?.email?.trim() || undefined,
    },
    seoDefaults: {
      titleTemplate: value.seoDefaults?.titleTemplate?.trim() || undefined,
      defaultDescription: value.seoDefaults?.defaultDescription?.trim() || undefined,
    },
    logo: {
      fileId: value.logo?.fileId?.trim() || undefined,
      url: value.logo?.url?.trim() || undefined,
      alt: value.logo?.alt?.trim() || undefined,
    },
    favicon: {
      fileId: value.favicon?.fileId?.trim() || undefined,
      url: value.favicon?.url?.trim() || undefined,
    },
  };
};

const sanitizeThemeSettingsForSave = (
  value: WebsiteSiteThemeSettings
): WebsiteSiteThemeSettings => ({
  ...value,
  colors: {
    primary: value.colors?.primary?.trim() || undefined,
    accent: value.colors?.accent?.trim() || undefined,
    background: value.colors?.background?.trim() || undefined,
    text: value.colors?.text?.trim() || undefined,
  },
  typography: {
    headingFont: value.typography?.headingFont?.trim() || undefined,
    bodyFont: value.typography?.bodyFont?.trim() || undefined,
  },
  radius: value.radius?.trim() || undefined,
});

export default function WebsiteSiteEditorPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const isEdit = Boolean(siteId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);

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

  const canSave =
    name.trim().length > 0 &&
    slug.trim().length > 0 &&
    defaultLocale.trim().length > 0 &&
    !mutation.isPending;

  const footerLinks = common.footer?.links ?? [];

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
            <div className="text-sm text-muted-foreground">
              Manage website branding and settings
            </div>
          </div>
        </div>
        <Button variant="accent" disabled={!canSave} onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
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
                  if (!isEdit) {
                    const trimmed = value.trim();
                    if (!common.siteTitle || common.siteTitle === "Website") {
                      syncCommon({
                        ...common,
                        siteTitle: trimmed || "Website",
                      });
                    }
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

          <div className="space-y-4 rounded-lg border border-border/60 p-4">
            <div>
              <h3 className="text-base font-semibold">Brand &amp; Settings</h3>
              <p className="text-sm text-muted-foreground">
                Structured settings for branding, SEO, socials, and theme tokens.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Site title</Label>
                <Input
                  value={common.siteTitle}
                  onChange={(event) => syncCommon({ ...common, siteTitle: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Site subtitle</Label>
                <Input
                  value={common.siteSubtitle ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      siteSubtitle: event.target.value.trim() ? event.target.value : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <Label>Logo</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <UploadCloud className="h-4 w-4" />
                    {isUploadingLogo ? "Uploading..." : "Upload"}
                  </Button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void uploadAsset("logo", event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>
                <Input
                  placeholder="Logo fileId"
                  value={common.logo?.fileId ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      logo: {
                        ...common.logo,
                        fileId: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Logo URL"
                  value={common.logo?.url ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      logo: {
                        ...common.logo,
                        url: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Logo alt text"
                  value={common.logo?.alt ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      logo: {
                        ...common.logo,
                        alt: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between">
                  <Label>Favicon</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUploadingFavicon}
                    onClick={() => faviconInputRef.current?.click()}
                  >
                    <UploadCloud className="h-4 w-4" />
                    {isUploadingFavicon ? "Uploading..." : "Upload"}
                  </Button>
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      void uploadAsset("favicon", event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </div>
                <Input
                  placeholder="Favicon fileId"
                  value={common.favicon?.fileId ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      favicon: {
                        ...common.favicon,
                        fileId: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Favicon URL"
                  value={common.favicon?.url ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      favicon: {
                        ...common.favicon,
                        url: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Header show logo</Label>
                  <Switch
                    checked={common.header?.showLogo ?? true}
                    onCheckedChange={(checked) =>
                      syncCommon({
                        ...common,
                        header: {
                          ...common.header,
                          showLogo: Boolean(checked),
                        },
                      })
                    }
                  />
                </div>
                <Input
                  placeholder="CTA label"
                  value={common.header?.cta?.label ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      header: {
                        ...common.header,
                        cta: {
                          ...(common.header?.cta ?? { href: "" }),
                          label: event.target.value,
                        },
                      },
                    })
                  }
                />
                <Input
                  placeholder="CTA href"
                  value={common.header?.cta?.href ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      header: {
                        ...common.header,
                        cta: {
                          ...(common.header?.cta ?? { label: "" }),
                          href: event.target.value,
                        },
                      },
                    })
                  }
                />
                <Input
                  placeholder="CTA variant (primary/secondary/outline/ghost)"
                  value={common.header?.cta?.variant ?? ""}
                  onChange={(event) => {
                    const variant = normalizeCtaVariant(event.target.value);
                    syncCommon({
                      ...common,
                      header: {
                        ...common.header,
                        cta: common.header?.cta
                          ? {
                              ...common.header.cta,
                              variant,
                            }
                          : undefined,
                      },
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Footer copyright text</Label>
                <Input
                  value={common.footer?.copyrightText ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      footer: {
                        ...common.footer,
                        links: footerLinks,
                        copyrightText: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />

                <div className="space-y-2 rounded-md border border-border/60 p-3">
                  <div className="flex items-center justify-between">
                    <Label>Footer links</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        syncCommon({
                          ...common,
                          footer: {
                            ...common.footer,
                            links: [...footerLinks, { label: "", href: "" }],
                          },
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add link
                    </Button>
                  </div>
                  {footerLinks.map((link, index) => (
                    <div
                      key={`${index}-${link.label}`}
                      className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                    >
                      <Input
                        placeholder="Label"
                        value={link.label}
                        onChange={(event) => {
                          const nextLinks = [...footerLinks];
                          nextLinks[index] = {
                            ...nextLinks[index],
                            label: event.target.value,
                          };
                          syncCommon({
                            ...common,
                            footer: {
                              ...common.footer,
                              links: nextLinks,
                            },
                          });
                        }}
                      />
                      <Input
                        placeholder="Href"
                        value={link.href}
                        onChange={(event) => {
                          const nextLinks = [...footerLinks];
                          nextLinks[index] = {
                            ...nextLinks[index],
                            href: event.target.value,
                          };
                          syncCommon({
                            ...common,
                            footer: {
                              ...common.footer,
                              links: nextLinks,
                            },
                          });
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const nextLinks = footerLinks.filter(
                            (_, itemIndex) => itemIndex !== index
                          );
                          syncCommon({
                            ...common,
                            footer: {
                              ...common.footer,
                              links: nextLinks,
                            },
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Social links</Label>
                {["youtube", "instagram", "tiktok", "x", "linkedin", "facebook", "email"].map(
                  (field) => (
                    <Input
                      key={field}
                      placeholder={field}
                      value={
                        (common.socials?.[field as keyof typeof common.socials] as string) ?? ""
                      }
                      onChange={(event) =>
                        syncCommon({
                          ...common,
                          socials: {
                            ...common.socials,
                            [field]: event.target.value.trim() ? event.target.value : undefined,
                          },
                        })
                      }
                    />
                  )
                )}
              </div>

              <div className="space-y-2">
                <Label>SEO defaults</Label>
                <Input
                  placeholder="Title template"
                  value={common.seoDefaults?.titleTemplate ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      seoDefaults: {
                        ...common.seoDefaults,
                        titleTemplate: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Textarea
                  rows={3}
                  placeholder="Default description"
                  value={common.seoDefaults?.defaultDescription ?? ""}
                  onChange={(event) =>
                    syncCommon({
                      ...common,
                      seoDefaults: {
                        ...common.seoDefaults,
                        defaultDescription: event.target.value.trim()
                          ? event.target.value
                          : undefined,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Theme tokens</Label>
              <div className="grid gap-3 md:grid-cols-2">
                <Input
                  placeholder="Primary color"
                  value={theme.colors?.primary ?? ""}
                  onChange={(event) =>
                    syncTheme({
                      ...theme,
                      colors: {
                        ...theme.colors,
                        primary: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Accent color"
                  value={theme.colors?.accent ?? ""}
                  onChange={(event) =>
                    syncTheme({
                      ...theme,
                      colors: {
                        ...theme.colors,
                        accent: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Background color"
                  value={theme.colors?.background ?? ""}
                  onChange={(event) =>
                    syncTheme({
                      ...theme,
                      colors: {
                        ...theme.colors,
                        background: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Text color"
                  value={theme.colors?.text ?? ""}
                  onChange={(event) =>
                    syncTheme({
                      ...theme,
                      colors: {
                        ...theme.colors,
                        text: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Heading font token"
                  value={theme.typography?.headingFont ?? ""}
                  onChange={(event) =>
                    syncTheme({
                      ...theme,
                      typography: {
                        ...theme.typography,
                        headingFont: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Body font token"
                  value={theme.typography?.bodyFont ?? ""}
                  onChange={(event) =>
                    syncTheme({
                      ...theme,
                      typography: {
                        ...theme.typography,
                        bodyFont: event.target.value.trim() ? event.target.value : undefined,
                      },
                    })
                  }
                />
                <Input
                  placeholder="Radius"
                  value={theme.radius ?? ""}
                  onChange={(event) =>
                    syncTheme({
                      ...theme,
                      radius: event.target.value.trim() ? event.target.value : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Custom properties</h3>
                <p className="text-sm text-muted-foreground">
                  Key/value JSON settings persisted through Custom Attributes.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setCustomRows((prev) => [
                    ...prev,
                    { id: createRowId(), key: "", valueText: "{}" },
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                Add property
              </Button>
            </div>

            {customRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom properties yet.</p>
            ) : null}

            {customRows.map((row, index) => (
              <div key={row.id} className="space-y-2 rounded-md border border-border/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Property #{index + 1}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setCustomRows((prev) => prev.filter((item) => item.id !== row.id));
                      setCustomRowErrors((prev) => {
                        const next = { ...prev };
                        delete next[row.id];
                        return next;
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="analytics.ga4"
                  value={row.key}
                  onChange={(event) =>
                    setCustomRows((prev) =>
                      prev.map((item) =>
                        item.id === row.id ? { ...item, key: event.target.value } : item
                      )
                    )
                  }
                />
                <Textarea
                  rows={4}
                  className="font-mono text-xs"
                  placeholder='{"enabled": true}'
                  value={row.valueText}
                  onChange={(event) =>
                    setCustomRows((prev) =>
                      prev.map((item) =>
                        item.id === row.id ? { ...item, valueText: event.target.value } : item
                      )
                    )
                  }
                />
                {customRowErrors[row.id] ? (
                  <p className="text-xs text-destructive">{customRowErrors[row.id]}</p>
                ) : null}
              </div>
            ))}
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="advanced-json">
              <AccordionTrigger>Advanced JSON</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Directly edit raw common/theme JSON. Apply to overwrite structured fields.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Common JSON</Label>
                    <Textarea
                      rows={10}
                      className="font-mono text-xs"
                      value={commonJson}
                      onChange={(event) => setCommonJson(event.target.value)}
                    />
                    {commonJsonState.error ? (
                      <p className="text-xs text-destructive">{commonJsonState.error}</p>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (commonJsonState.status === "invalid") {
                          toast.error("Common JSON is invalid.");
                          return;
                        }
                        const parsed = WebsiteSiteCommonSettingsSchema.safeParse(
                          commonJsonState.parsed
                        );
                        if (!parsed.success) {
                          toast.error(parsed.error.issues[0]?.message || "Common JSON is invalid.");
                          return;
                        }
                        syncCommon(parsed.data);
                        toast.success("Applied common JSON.");
                      }}
                    >
                      Apply common JSON
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Theme JSON</Label>
                    <Textarea
                      rows={10}
                      className="font-mono text-xs"
                      value={themeJson}
                      onChange={(event) => setThemeJson(event.target.value)}
                    />
                    {themeJsonState.error ? (
                      <p className="text-xs text-destructive">{themeJsonState.error}</p>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (themeJsonState.status === "invalid") {
                          toast.error("Theme JSON is invalid.");
                          return;
                        }
                        const parsed = WebsiteSiteThemeSettingsSchema.safeParse(
                          themeJsonState.parsed
                        );
                        if (!parsed.success) {
                          toast.error(parsed.error.issues[0]?.message || "Theme JSON is invalid.");
                          return;
                        }
                        syncTheme(parsed.data);
                        toast.success("Applied theme JSON.");
                      }}
                    >
                      Apply theme JSON
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
