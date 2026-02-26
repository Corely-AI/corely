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
  const footerLinks = common.footer?.links ?? [];

  return (
    <>
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
                onUploadAsset("logo", event.target.files);
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
                onUploadAsset("favicon", event.target.files);
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
          <Label>Social links</Label>
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
