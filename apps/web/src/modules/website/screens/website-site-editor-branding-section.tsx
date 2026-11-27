import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import { Plus, Trash2, UploadCloud } from "lucide-react";
import { Button, Input, Label, Switch, Textarea } from "@corely/ui";
import type { WebsiteSiteCommonSettings } from "@corely/contracts";
import type { RefObject } from "react";
import { normalizeCtaVariant } from "./website-site-editor-utils";

type WebsiteSiteEditorBrandingSectionProps = {
  common: WebsiteSiteCommonSettings;
  syncCommon: (next: WebsiteSiteCommonSettings) => void;
  logoInputRef: RefObject<HTMLInputElement | null>;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  isUploadingLogo: boolean;
  isUploadingFavicon: boolean;
  onUploadAsset: (kind: "logo" | "favicon", files: FileList | null) => void;
};

const socialFields = [
  "youtube",
  "instagram",
  "tiktok",
  "x",
  "linkedin",
  "facebook",
  "email",
] as const;

export function WebsiteSiteEditorBrandingSection({
  common,
  syncCommon,
  logoInputRef,
  faviconInputRef,
  isUploadingLogo,
  isUploadingFavicon,
  onUploadAsset,
}: WebsiteSiteEditorBrandingSectionProps) {
  const uiCopy = useUiCopy("ui.website-website-site-editor-branding-section");
  const footerLinks = common.footer?.links ?? [];

  return (
    <>
      <div>
        <h3 className="text-base font-semibold">Brand &amp; Settings</h3>
        <p className="text-sm text-muted-foreground">
          {uiCopy("structured-settings-for-branding")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{uiCopy("site-title")}</Label>
          <Input
            value={common.siteTitle}
            onChange={(event) => syncCommon({ ...common, siteTitle: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{uiCopy("site-subtitle")}</Label>
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
            <Label>{uiCopy("logo")}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploadingLogo}
              onClick={() => logoInputRef.current?.click()}
            >
              <UploadCloud className="h-4 w-4" />
              {isUploadingLogo ? uiCopy("uploading") : uiCopy("upload")}
            </Button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                onUploadAsset("logo", event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </div>
          <Input
            placeholder={uiCopy("logo-fileid")}
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
            placeholder={uiCopy("logo-url")}
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
            placeholder={uiCopy("logo-alt-text")}
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
            <Label>{uiCopy("favicon")}</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploadingFavicon}
              onClick={() => faviconInputRef.current?.click()}
            >
              <UploadCloud className="h-4 w-4" />
              {isUploadingFavicon ? uiCopy("uploading") : uiCopy("upload")}
            </Button>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                onUploadAsset("favicon", event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </div>
          <Input
            placeholder={uiCopy("favicon-fileid")}
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
            placeholder={uiCopy("favicon-url")}
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
            <Label>{uiCopy("header-show-logo")}</Label>
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
            placeholder={uiCopy("cta-label")}
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
            placeholder={uiCopy("cta-href")}
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
            placeholder={uiCopy("cta-variant-primary-secondary")}
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
          <Label>{uiCopy("footer-copyright-text")}</Label>
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
              <Label>{uiCopy("footer-links")}</Label>
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
                {uiCopy("add-link")}
              </Button>
            </div>
            {footerLinks.map((link, index) => (
              <div
                key={`${index}-${link.label}`}
                className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
              >
                <Input
                  placeholder={uiCopy("label")}
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
                  placeholder={uiCopy("href")}
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
                    const nextLinks = footerLinks.filter((_, itemIndex) => itemIndex !== index);
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
          <Label>{uiCopy("social-links")}</Label>
          {socialFields.map((field) => (
            <Input
              key={field}
              placeholder={field}
              value={common.socials?.[field] ?? ""}
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
          ))}
        </div>

        <div className="space-y-2">
          <Label>{uiCopy("seo-defaults")}</Label>
          <Input
            placeholder={uiCopy("title-template")}
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
            placeholder={uiCopy("default-description")}
            value={common.seoDefaults?.defaultDescription ?? ""}
            onChange={(event) =>
              syncCommon({
                ...common,
                seoDefaults: {
                  ...common.seoDefaults,
                  defaultDescription: event.target.value.trim() ? event.target.value : undefined,
                },
              })
            }
          />
        </div>
      </div>
    </>
  );
}
