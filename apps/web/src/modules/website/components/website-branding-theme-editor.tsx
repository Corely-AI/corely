import React, { useMemo } from "react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@corely/ui";
import { JsonEditorField } from "./website-json-editor-field";
import {
  formatJsonInput,
  getNestedStringField,
  getStringField,
  type JsonFieldState,
  isPlainObject,
  setNestedStringField,
  setStringField,
  updateJsonString,
} from "./website-branding-theme-utils";

export type WebsiteBrandingThemeEditorProps = {
  brandingJson: string;
  themeJson: string;
  brandingState: JsonFieldState;
  themeState: JsonFieldState;
  onBrandingChange: (value: string) => void;
  onThemeChange: (value: string) => void;
};

export const WebsiteBrandingThemeEditor = ({
  brandingJson,
  themeJson,
  brandingState,
  themeState,
  onBrandingChange,
  onThemeChange,
}: WebsiteBrandingThemeEditorProps) => {
  const brandingValues = useMemo(() => {
    const parsed = brandingState.parsed;
    const obj = isPlainObject(parsed) ? parsed : {};
    return {
      brandName: getStringField(obj.brandName),
      logoUrl: getStringField(obj.logoUrl),
      logoAlt: getStringField(obj.logoAlt),
      supportEmail: getStringField(obj.supportEmail),
      supportPhone: getStringField(obj.supportPhone),
      tagline: getStringField(obj.tagline),
    };
  }, [brandingState.parsed]);

  const themeValues = useMemo(() => {
    const parsed = themeState.parsed;
    const obj = isPlainObject(parsed) ? parsed : {};
    return {
      primary: getNestedStringField(obj, ["colors", "primary"]),
      accent: getNestedStringField(obj, ["colors", "accent"]),
      background: getNestedStringField(obj, ["colors", "background"]),
      headingFont: getNestedStringField(obj, ["typography", "headingFont"]),
      bodyFont: getNestedStringField(obj, ["typography", "bodyFont"]),
      radius: getStringField(obj.radius),
    };
  }, [themeState.parsed]);

  const brandingExample = {
    logoUrl: "https://example.com/logo.svg",
    logoAlt: "Brand logo",
    supportEmail: "hello@example.com",
  };

  const themeExample = {
    colors: {
      primary: "#0f172a",
      accent: "#38bdf8",
      background: "#ffffff",
    },
    typography: {
      headingFont: "var(--font-display)",
      bodyFont: "var(--font-body)",
    },
    radius: "8px",
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="branding-theme">
        <AccordionTrigger>Branding &amp; theme (optional)</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <Tabs defaultValue="guided" className="w-full">
            <TabsList>
              <TabsTrigger value="guided">Guided</TabsTrigger>
              <TabsTrigger value="advanced">Advanced JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="guided" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4 rounded-lg border border-input bg-muted/20 p-4">
                  <div className="space-y-1">
                    <Label>Branding</Label>
                    <p className="text-xs text-muted-foreground">
                      Add a logo and contact details without touching JSON.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Brand name</Label>
                      <Input
                        value={brandingValues.brandName}
                        onChange={(event) =>
                          onBrandingChange(
                            updateJsonString(brandingJson, (draft) => {
                              setStringField(draft, "brandName", event.target.value);
                            })
                          )
                        }
                        placeholder="Corely"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tagline</Label>
                      <Input
                        value={brandingValues.tagline}
                        onChange={(event) =>
                          onBrandingChange(
                            updateJsonString(brandingJson, (draft) => {
                              setStringField(draft, "tagline", event.target.value);
                            })
                          )
                        }
                        placeholder="AI-native ERP for teams"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Logo URL</Label>
                      <Input
                        value={brandingValues.logoUrl}
                        onChange={(event) =>
                          onBrandingChange(
                            updateJsonString(brandingJson, (draft) => {
                              setStringField(draft, "logoUrl", event.target.value);
                            })
                          )
                        }
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Logo alt text</Label>
                      <Input
                        value={brandingValues.logoAlt}
                        onChange={(event) =>
                          onBrandingChange(
                            updateJsonString(brandingJson, (draft) => {
                              setStringField(draft, "logoAlt", event.target.value);
                            })
                          )
                        }
                        placeholder="Company logo"
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Support email</Label>
                        <Input
                          value={brandingValues.supportEmail}
                          onChange={(event) =>
                            onBrandingChange(
                              updateJsonString(brandingJson, (draft) => {
                                setStringField(draft, "supportEmail", event.target.value);
                              })
                            )
                          }
                          placeholder="hello@company.com"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Support phone</Label>
                        <Input
                          value={brandingValues.supportPhone}
                          onChange={(event) =>
                            onBrandingChange(
                              updateJsonString(brandingJson, (draft) => {
                                setStringField(draft, "supportPhone", event.target.value);
                              })
                            )
                          }
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border border-input bg-muted/20 p-4">
                  <div className="space-y-1">
                    <Label>Theme</Label>
                    <p className="text-xs text-muted-foreground">
                      Pick brand colors and typography tokens.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Primary</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                            value={themeValues.primary || "#0f172a"}
                            onChange={(event) =>
                              onThemeChange(
                                updateJsonString(themeJson, (draft) => {
                                  setNestedStringField(
                                    draft,
                                    ["colors", "primary"],
                                    event.target.value
                                  );
                                })
                              )
                            }
                          />
                          <Input
                            value={themeValues.primary}
                            onChange={(event) =>
                              onThemeChange(
                                updateJsonString(themeJson, (draft) => {
                                  setNestedStringField(
                                    draft,
                                    ["colors", "primary"],
                                    event.target.value
                                  );
                                })
                              )
                            }
                            placeholder="#0f172a"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Accent</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                            value={themeValues.accent || "#38bdf8"}
                            onChange={(event) =>
                              onThemeChange(
                                updateJsonString(themeJson, (draft) => {
                                  setNestedStringField(
                                    draft,
                                    ["colors", "accent"],
                                    event.target.value
                                  );
                                })
                              )
                            }
                          />
                          <Input
                            value={themeValues.accent}
                            onChange={(event) =>
                              onThemeChange(
                                updateJsonString(themeJson, (draft) => {
                                  setNestedStringField(
                                    draft,
                                    ["colors", "accent"],
                                    event.target.value
                                  );
                                })
                              )
                            }
                            placeholder="#38bdf8"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Background</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background p-1"
                            value={themeValues.background || "#ffffff"}
                            onChange={(event) =>
                              onThemeChange(
                                updateJsonString(themeJson, (draft) => {
                                  setNestedStringField(
                                    draft,
                                    ["colors", "background"],
                                    event.target.value
                                  );
                                })
                              )
                            }
                          />
                          <Input
                            value={themeValues.background}
                            onChange={(event) =>
                              onThemeChange(
                                updateJsonString(themeJson, (draft) => {
                                  setNestedStringField(
                                    draft,
                                    ["colors", "background"],
                                    event.target.value
                                  );
                                })
                              )
                            }
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Heading font token</Label>
                        <Input
                          value={themeValues.headingFont}
                          onChange={(event) =>
                            onThemeChange(
                              updateJsonString(themeJson, (draft) => {
                                setNestedStringField(
                                  draft,
                                  ["typography", "headingFont"],
                                  event.target.value
                                );
                              })
                            )
                          }
                          placeholder="var(--font-display)"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Body font token</Label>
                        <Input
                          value={themeValues.bodyFont}
                          onChange={(event) =>
                            onThemeChange(
                              updateJsonString(themeJson, (draft) => {
                                setNestedStringField(
                                  draft,
                                  ["typography", "bodyFont"],
                                  event.target.value
                                );
                              })
                            )
                          }
                          placeholder="var(--font-body)"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Corner radius</Label>
                      <Input
                        value={themeValues.radius}
                        onChange={(event) =>
                          onThemeChange(
                            updateJsonString(themeJson, (draft) => {
                              setStringField(draft, "radius", event.target.value);
                            })
                          )
                        }
                        placeholder="8px"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Empty fields use default theme values.
                  </p>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <JsonEditorField
                  label="Branding JSON"
                  description="Logo, contact info, or custom brand metadata used by templates."
                  value={brandingJson}
                  onChange={onBrandingChange}
                  onFormat={() => {
                    if (brandingState.status === "invalid") {
                      toast.error("Branding JSON is invalid.");
                      return;
                    }
                    onBrandingChange(formatJsonInput(brandingJson));
                  }}
                  onUseExample={() => onBrandingChange(JSON.stringify(brandingExample, null, 2))}
                  onClear={() => onBrandingChange("")}
                  state={brandingState}
                  placeholder='{"logoUrl": "..."}'
                />
                <JsonEditorField
                  label="Theme JSON"
                  description="Theme tokens such as colors, typography, and radius values."
                  value={themeJson}
                  onChange={onThemeChange}
                  onFormat={() => {
                    if (themeState.status === "invalid") {
                      toast.error("Theme JSON is invalid.");
                      return;
                    }
                    onThemeChange(formatJsonInput(themeJson));
                  }}
                  onUseExample={() => onThemeChange(JSON.stringify(themeExample, null, 2))}
                  onClear={() => onThemeChange("")}
                  state={themeState}
                  placeholder='{"colors": {"primary": "#0f172a"}}'
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave these empty to rely on default styles. Only valid JSON will be saved.
              </p>
            </TabsContent>
          </Tabs>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
