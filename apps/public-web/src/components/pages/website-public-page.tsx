import React from "react";
import type {
  ListPublicWebsiteWallOfLoveItemsOutput,
  ResolveWebsitePublicOutput,
} from "@corely/contracts";
import { PublicSiteLayout } from "@/components/website/public-site-layout";
import { TemplateDefault } from "@/components/website/template-default";
import { buildPublicFileUrl } from "@/lib/public-api";

const toYoutubeEmbedUrl = (linkUrl: string | undefined): string | null => {
  if (!linkUrl) {
    return null;
  }
  try {
    const parsed = new URL(linkUrl);
    const videoId = parsed.searchParams.get("v");
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
};

export const WebsitePublicPageScreen = ({
  page,
  host,
  previewMode,
  basePath,
  wallOfLoveItems,
}: {
  page: ResolveWebsitePublicOutput;
  host?: string | null;
  previewMode?: boolean;
  basePath?: string;
  wallOfLoveItems?: ListPublicWebsiteWallOfLoveItemsOutput["items"];
}) => {
  const template = page.template?.toLowerCase() ?? "default";
  const Template = template === "default" ? TemplateDefault : TemplateDefault;

  return (
    <PublicSiteLayout menus={page.menus} host={host} previewMode={previewMode} basePath={basePath}>
      <Template payload={page.payloadJson} />
      {wallOfLoveItems && wallOfLoveItems.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
          <h2 className="mb-6 text-2xl font-semibold">Wall Of Love</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {wallOfLoveItems.map((item) => {
              const youtubeEmbed = toYoutubeEmbedUrl(item.linkUrl);
              const imageSrc =
                item.type === "image"
                  ? (item.imageUrl ??
                    (item.imageFileId ? buildPublicFileUrl(item.imageFileId) : null))
                  : null;
              return (
                <article key={item.id} className="rounded-xl border border-border/60 bg-card p-4">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={item.authorName ?? "Wall Of Love image"}
                      className="mb-3 h-44 w-full rounded-lg object-cover"
                    />
                  ) : null}
                  {item.type === "youtube" && youtubeEmbed ? (
                    <iframe
                      src={youtubeEmbed}
                      title={item.authorName ?? "YouTube testimonial"}
                      className="mb-3 h-44 w-full rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : null}
                  {item.type === "x" && item.linkUrl ? (
                    <a
                      href={item.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-3 inline-block text-sm text-primary underline"
                    >
                      View on X
                    </a>
                  ) : null}
                  {item.quote ? <p className="text-sm leading-relaxed">"{item.quote}"</p> : null}
                  {(item.authorName || item.authorTitle || item.sourceLabel) && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.authorName ?? "Anonymous"}
                      {item.authorTitle ? `, ${item.authorTitle}` : ""}
                      {item.sourceLabel ? ` · ${item.sourceLabel}` : ""}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </PublicSiteLayout>
  );
};
