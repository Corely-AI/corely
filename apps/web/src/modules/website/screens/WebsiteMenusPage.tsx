import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Plus, ChevronUp, ChevronDown, Trash2, Code2 } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { websiteApi } from "@/lib/website-api";
import { websiteMenuKeys } from "../queries";
import { toast } from "sonner";

type MenuItem = {
  id: string;
  label: string;
  href: string;
};

const createItemId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const normalizeMenuItems = (itemsJson: unknown): MenuItem[] => {
  if (!Array.isArray(itemsJson)) {
    return [];
  }
  return itemsJson
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const candidate = item as { label?: unknown; href?: unknown };
      if (typeof candidate.label !== "string" || typeof candidate.href !== "string") {
        return null;
      }
      return {
        id: createItemId(),
        label: candidate.label,
        href: candidate.href,
      };
    })
    .filter((item): item is MenuItem => Boolean(item));
};

export default function WebsiteMenusPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [menuName, setMenuName] = useState("header");
  const [locale, setLocale] = useState("en-US");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [itemsJson, setItemsJson] = useState("[]");
  const [advancedMode, setAdvancedMode] = useState(false);

  const menuQueryKey = useMemo(() => websiteMenuKeys.list(siteId ?? ""), [siteId]);

  const { data } = useQuery({
    queryKey: menuQueryKey,
    queryFn: () => (siteId ? websiteApi.listMenus(siteId) : Promise.resolve({ items: [] })),
    enabled: Boolean(siteId),
  });

  useEffect(() => {
    if (!data?.items) {
      return;
    }
    const existing = data.items.find((menu) => menu.name === menuName && menu.locale === locale);
    const normalized = normalizeMenuItems(existing?.itemsJson ?? []);
    setItems(normalized);
    setItemsJson(
      JSON.stringify(
        normalized.map(({ label, href }) => ({ label, href })),
        null,
        2
      )
    );
    setAdvancedMode(false);
  }, [data, menuName, locale]);

  useEffect(() => {
    if (advancedMode) {
      return;
    }
    setItemsJson(
      JSON.stringify(
        items.map(({ label, href }) => ({ label, href })),
        null,
        2
      )
    );
  }, [items, advancedMode]);

  const updateItem = (id: string, patch: Partial<MenuItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    setItems((current) => {
      const index = current.findIndex((item) => item.id === id);
      if (index === -1) {
        return current;
      }
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: createItemId(),
        label: "",
        href: "",
      },
    ]);
  };

  const applyJson = () => {
    let parsed: unknown = [];
    try {
      parsed = itemsJson.trim() ? JSON.parse(itemsJson) : [];
    } catch {
      toast.error("Menu JSON must be valid JSON");
      return;
    }
    const normalized = normalizeMenuItems(parsed);
    setItems(normalized);
    setAdvancedMode(false);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!siteId) {
        return;
      }
      const invalidItem = items.find((item) => !item.label.trim() || !item.href.trim());
      if (invalidItem) {
        throw new Error("Each menu item needs a label and a link.");
      }
      return websiteApi.upsertMenu(siteId, {
        siteId,
        name: menuName,
        locale,
        itemsJson: items.map(({ label, href }) => ({
          label: label.trim(),
          href: href.trim(),
        })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: menuQueryKey });
      toast.success("Menu saved");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save menu");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <div className="text-lg font-semibold">Menus</div>
            <div className="text-sm text-muted-foreground">Configure navigation menus</div>
          </div>
        </div>
        <Button variant="accent" onClick={() => void mutation.mutate()}>
          <Save className="h-4 w-4" />
          Save menu
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Menu</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={menuName}
                onChange={(event) => setMenuName(event.target.value)}
              >
                <option value="header">Header</option>
                <option value="footer">Footer</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Locale</Label>
              <Input value={locale} onChange={(event) => setLocale(event.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Menu items</Label>
                <p className="text-sm text-muted-foreground">
                  Add links in order. Use full URLs for external links.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="rounded-md border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No menu items yet.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, index) => {
                  const hasError = !item.label.trim() || !item.href.trim();
                  return (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-md border border-border/60 p-3 md:grid-cols-[1.2fr_1.5fr_auto]"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Label</Label>
                        <Input
                          value={item.label}
                          className={hasError && !item.label.trim() ? "border-destructive" : ""}
                          onChange={(event) => updateItem(item.id, { label: event.target.value })}
                          placeholder="Home"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Link</Label>
                        <Input
                          value={item.href}
                          className={hasError && !item.href.trim() ? "border-destructive" : ""}
                          onChange={(event) => updateItem(item.id, { href: event.target.value })}
                          placeholder="/about or https://example.com"
                        />
                      </div>
                      <div className="flex items-end gap-1 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => moveItem(item.id, "up")}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === items.length - 1}
                          onClick={() => moveItem(item.id, "down")}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md border border-border/60 bg-muted/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Code2 className="h-4 w-4" />
                Advanced JSON
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAdvancedMode((v) => !v)}>
                {advancedMode ? "Hide" : "Edit JSON"}
              </Button>
            </div>
            {advancedMode ? (
              <div className="space-y-2">
                <Textarea
                  value={itemsJson}
                  onChange={(event) => setItemsJson(event.target.value)}
                  rows={8}
                  placeholder='[{"label": "Home", "href": "/"}]'
                />
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={applyJson}>
                    Apply JSON
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Prefer raw JSON? Use advanced mode to paste or edit directly.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
