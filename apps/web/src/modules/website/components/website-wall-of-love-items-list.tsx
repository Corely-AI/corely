import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React from "react";
import { ArrowDown, ArrowUp, Pencil } from "lucide-react";
import { LoadingSkeleton, Badge, Button, Card, CardContent } from "@corely/ui";
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
  const uiCopy = useUiCopy("ui.website-website-wall-of-love-items-list");
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="text-base font-semibold">{uiCopy("items")}</div>
        {isLoading ? (
          <LoadingSkeleton variant="list" label={uiCopy("loading-items")} />
        ) : items.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
            {uiCopy("no-wall-of-love")}
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
                    <div className="font-medium line-clamp-2">
                      {item.quote || uiCopy("no-quote")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.authorName || uiCopy("unknown-author")}
                      {item.authorTitle ? ` · ${item.authorTitle}` : ""}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant={item.status === "published" ? "success" : "warning"}>
                        {item.status}
                      </Badge>
                      <span>
                        {uiCopy("type") + " "}
                        {item.type}
                      </span>
                      <span>
                        {uiCopy("images") + " "}
                        {item.imageFileIds.length}
                      </span>
                      <span>
                        {uiCopy("order") + " "}
                        {index + 1}
                      </span>
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
                      {uiCopy("unpublish")}
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => onPublishItem(item.id)}>
                      {uiCopy("publish")}
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
              {uiCopy("save-order")}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
