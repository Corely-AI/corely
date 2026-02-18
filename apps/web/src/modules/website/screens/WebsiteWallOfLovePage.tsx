import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Pencil,
  Save,
  Star,
  UploadCloud,
} from "lucide-react";
import { Badge, Button, Card, CardContent, Input, Label, Textarea } from "@corely/ui";
import { toast } from "sonner";
import { websiteApi } from "@/lib/website-api";
import { buildPublicFileUrl, cmsApi } from "@/lib/cms-api";
import { websiteWallOfLoveKeys } from "../queries";
import type { WebsiteWallOfLoveItemDto, WebsiteWallOfLoveItemType } from "@corely/contracts";

type FormState = {
  type: WebsiteWallOfLoveItemType;
  quote: string;
  authorName: string;
  authorTitle: string;
  sourceLabel: string;
  linkUrl: string;
  imageFileIds: string[];
};

const DEFAULT_FORM: FormState = {
  type: "image",
  quote: "",
  authorName: "",
  authorTitle: "",
  sourceLabel: "",
  linkUrl: "",
  imageFileIds: [],
};

const toOptionalString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toNullableString = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const dedupeFileIds = (fileIds: string[]): string[] =>
  Array.from(new Set(fileIds.map((id) => id.trim()).filter(Boolean)));

export default function WebsiteWallOfLovePage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [manualFileId, setManualFileId] = useState("");
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const listQueryKey = useMemo(
    () => (siteId ? websiteWallOfLoveKeys.list(siteId) : ["website-wall-of-love", "empty"]),
    [siteId]
  );

  const siteQuery = useQuery({
    queryKey: ["website-site", siteId],
    queryFn: () => (siteId ? websiteApi.getSite(siteId) : Promise.resolve(null)),
    enabled: Boolean(siteId),
  });

  const itemsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      siteId
        ? websiteApi.listWallOfLoveItems(siteId)
        : Promise.resolve({
            items: [],
          }),
    enabled: Boolean(siteId),
  });

  const items = itemsQuery.data?.items ?? [];
  const currentOrderSignature = useMemo(() => items.map((item) => item.id).join("|"), [items]);

  useEffect(() => {
    setOrderedIds(items.map((item) => item.id));
  }, [currentOrderSignature]);

  const orderedItems = useMemo(() => {
    const byId = new Map(items.map((item) => [item.id, item]));
    return orderedIds
      .map((id) => byId.get(id))
      .filter((item): item is WebsiteWallOfLoveItemDto => Boolean(item));
  }, [items, orderedIds]);

  const isOrderDirty = useMemo(() => {
    const current = items.map((item) => item.id).join("|");
    const draft = orderedIds.join("|");
    return current !== draft;
  }, [items, orderedIds]);

  const resetForm = () => {
    setEditingItemId(null);
    setForm(DEFAULT_FORM);
    setManualFileId("");
  };

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (!siteId) {
        throw new Error("Missing siteId");
      }

      const imageFileIds = dedupeFileIds(form.imageFileIds);
      if (editingItemId) {
        return websiteApi.updateWallOfLoveItem(editingItemId, {
          type: form.type,
          quote: toNullableString(form.quote),
          authorName: toNullableString(form.authorName),
          authorTitle: toNullableString(form.authorTitle),
          sourceLabel: toNullableString(form.sourceLabel),
          linkUrl: form.type === "image" ? null : (toNullableString(form.linkUrl) as string | null),
          imageFileIds,
        });
      }

      return websiteApi.createWallOfLoveItem(siteId, {
        type: form.type,
        quote: toOptionalString(form.quote),
        authorName: toOptionalString(form.authorName),
        authorTitle: toOptionalString(form.authorTitle),
        sourceLabel: toOptionalString(form.sourceLabel),
        linkUrl: form.type === "image" ? undefined : toOptionalString(form.linkUrl),
        imageFileIds,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      toast.success(editingItemId ? "Wall Of Love item updated" : "Wall Of Love item created");
      resetForm();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save item");
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (itemId: string) => websiteApi.publishWallOfLoveItem(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      toast.success("Item published");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to publish item");
    },
  });

  const unpublishMutation = useMutation({
    mutationFn: async (itemId: string) => websiteApi.unpublishWallOfLoveItem(itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      toast.success("Item unpublished");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to unpublish item");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async () => {
      if (!siteId) {
        throw new Error("Missing siteId");
      }
      return websiteApi.reorderWallOfLoveItems(siteId, orderedIds);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      toast.success("Order saved");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to save order");
    },
  });

  const onEdit = (item: WebsiteWallOfLoveItemDto) => {
    setEditingItemId(item.id);
    setForm({
      type: item.type,
      quote: item.quote ?? "",
      authorName: item.authorName ?? "",
      authorTitle: item.authorTitle ?? "",
      sourceLabel: item.sourceLabel ?? "",
      linkUrl: item.linkUrl ?? "",
      imageFileIds: item.imageFileIds,
    });
    setManualFileId("");
  };

  const moveItem = (itemId: string, direction: "up" | "down") => {
    setOrderedIds((prev) => {
      const index = prev.indexOf(itemId);
      if (index < 0) {
        return prev;
      }
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  };

  const addManualFileId = () => {
    const trimmed = manualFileId.trim();
    if (!trimmed) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      imageFileIds: dedupeFileIds([...prev.imageFileIds, trimmed]),
    }));
    setManualFileId("");
  };

  const onUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }
    setIsUploadingImages(true);

    try {
      const uploadedFileIds: string[] = [];
      for (const file of Array.from(files)) {
        const uploaded = await cmsApi.uploadCmsAsset(file, {
          purpose: "website-wall-of-love-image",
          category: "website",
        });
        uploadedFileIds.push(uploaded.fileId);
      }

      setForm((prev) => ({
        ...prev,
        imageFileIds: dedupeFileIds([...prev.imageFileIds, ...uploadedFileIds]),
      }));
      toast.success(`Uploaded ${uploadedFileIds.length} image(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload images");
    } finally {
      setIsUploadingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
            <div className="text-lg font-semibold">Wall Of Love</div>
            <div className="text-sm text-muted-foreground">
              Manage testimonials for {siteQuery.data?.site?.name ?? "this website"}.
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Star className="h-4 w-4" />
            {editingItemId ? "Edit item" : "Create item"}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    type: event.target.value as WebsiteWallOfLoveItemType,
                  }))
                }
              >
                <option value="image">Image</option>
                <option value="youtube">YouTube</option>
                <option value="x">X</option>
              </select>
            </div>
            {(form.type === "youtube" || form.type === "x") && (
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  value={form.linkUrl}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, linkUrl: event.target.value }))
                  }
                  placeholder={
                    form.type === "youtube"
                      ? "https://www.youtube.com/watch?v=..."
                      : "https://x.com/username/status/..."
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Quote</Label>
            <Textarea
              rows={4}
              value={form.quote}
              onChange={(event) => setForm((prev) => ({ ...prev, quote: event.target.value }))}
              placeholder="What did the customer say?"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Author name</Label>
              <Input
                value={form.authorName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, authorName: event.target.value }))
                }
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Author title</Label>
              <Input
                value={form.authorTitle}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, authorTitle: event.target.value }))
                }
                placeholder="Founder, Example Inc."
              />
            </div>
            <div className="space-y-2">
              <Label>Source label</Label>
              <Input
                value={form.sourceLabel}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sourceLabel: event.target.value }))
                }
                placeholder="Twitter / YouTube / Customer story"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Image attachments (fileIds)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={manualFileId}
                onChange={(event) => setManualFileId(event.target.value)}
                placeholder="Paste fileId and press Add"
                className="max-w-sm"
              />
              <Button type="button" variant="outline" onClick={addManualFileId}>
                <ImagePlus className="h-4 w-4" />
                Add
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImages}
              >
                <UploadCloud className="h-4 w-4" />
                {isUploadingImages ? "Uploading..." : "Upload images"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  void onUploadImages(event.target.files);
                }}
              />
            </div>
            {form.imageFileIds.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {form.imageFileIds.map((fileId) => (
                  <div key={fileId} className="rounded-md border border-border/60 p-2 space-y-2">
                    <img
                      src={buildPublicFileUrl(fileId)}
                      alt={fileId}
                      className="h-24 w-full rounded object-cover bg-muted"
                    />
                    <div className="text-xs text-muted-foreground break-all">{fileId}</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          imageFileIds: prev.imageFileIds.filter((id) => id !== fileId),
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No images attached yet.</div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {editingItemId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel edit
              </Button>
            ) : null}
            <Button type="button" variant="accent" onClick={() => void upsertMutation.mutate()}>
              <Save className="h-4 w-4" />
              {editingItemId ? "Update item" : "Create item"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-base font-semibold">Items</div>
          {itemsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading items...</div>
          ) : orderedItems.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
              No Wall Of Love items yet.
            </div>
          ) : (
            <div className="space-y-2">
              {orderedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-md border border-border/60 p-4 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="font-medium line-clamp-2">{item.quote || "(No quote)"}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.authorName || "Unknown author"}
                      {item.authorTitle ? ` · ${item.authorTitle}` : ""}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={item.status === "published" ? "success" : "warning"}>
                        {item.status}
                      </Badge>
                      <span>type: {item.type}</span>
                      <span>images: {item.imageFileIds.length}</span>
                      <span>order: {index + 1}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(item.id, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveItem(item.id, "down")}
                      disabled={index === orderedItems.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {item.status === "published" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void unpublishMutation.mutate(item.id)}
                      >
                        Unpublish
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void publishMutation.mutate(item.id)}
                      >
                        Publish
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {orderedItems.length > 0 ? (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="accent"
                disabled={!isOrderDirty}
                onClick={() => void reorderMutation.mutate()}
              >
                Save order
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
