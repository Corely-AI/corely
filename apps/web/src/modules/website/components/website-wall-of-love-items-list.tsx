import React from "react";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@corely/ui";
import { buildPublicFileUrl } from "@/lib/cms-api";
import type { WebsiteWallOfLoveItemDto } from "@corely/contracts";

type WebsiteWallOfLoveItemsListProps = {
  isLoading: boolean;
  items: WebsiteWallOfLoveItemDto[];
  isOrderDirty: boolean;
  onMoveItem: (itemId: string, direction: "up" | "down") => void;
  onEditItem: (item: WebsiteWallOfLoveItemDto) => void;
  onPublishItem: (itemId: string) => void;
  onUnpublishItem: (itemId: string) => void;
  onSaveOrder: () => void;
};

export function WebsiteWallOfLoveItemsList({
  isLoading,
  items,
  isOrderDirty,
  onMoveItem,
  onEditItem,
  onPublishItem,
  onUnpublishItem,
  onSaveOrder,
}: WebsiteWallOfLoveItemsListProps) {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-base font-semibold">Items</div>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            No Wall Of Love items yet.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="rounded-md border border-border/60 p-4 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  {item.imageFileIds[0] ? (
                    <img
                      src={buildPublicFileUrl(item.imageFileIds[0])}
                      alt={item.quote || item.authorName || "Wall Of Love preview"}
                      className="h-16 w-16 rounded object-cover bg-muted border border-border/60"
                    />
                  ) : null}
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
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onMoveItem(item.id, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onMoveItem(item.id, "down")}
                    disabled={index === items.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditItem(item)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {item.status === "published" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onUnpublishItem(item.id)}
                    >
                      Unpublish
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => onPublishItem(item.id)}>
                      Publish
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <div className="flex justify-end">
            <Button type="button" variant="accent" disabled={!isOrderDirty} onClick={onSaveOrder}>
              Save order
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
