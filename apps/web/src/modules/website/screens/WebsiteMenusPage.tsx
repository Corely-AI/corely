import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { websiteApi } from "@/lib/website-api";
import { websiteMenuKeys } from "../queries";
import { toast } from "sonner";

export default function WebsiteMenusPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [menuName, setMenuName] = useState("header");
  const [locale, setLocale] = useState("en-US");
  const [itemsJson, setItemsJson] = useState("[]");

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
    if (existing) {
      setItemsJson(JSON.stringify(existing.itemsJson ?? [], null, 2));
    }
  }, [data, menuName, locale]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!siteId) {
        return;
      }
      let parsed: unknown = [];
      try {
        parsed = itemsJson.trim() ? JSON.parse(itemsJson) : [];
      } catch {
        throw new Error("Menu JSON must be valid JSON");
      }
      return websiteApi.upsertMenu(siteId, {
        siteId,
        name: menuName,
        locale,
        itemsJson: parsed,
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
          <div className="space-y-2">
            <Label>Items JSON</Label>
            <Textarea
              value={itemsJson}
              onChange={(event) => setItemsJson(event.target.value)}
              rows={10}
              placeholder='[{"label": "Home", "href": "/"}]'
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
