import React from "react";
import { CmsPayloadRenderer } from "./cms-payload-renderer";
import { extractCmsPayloadMeta } from "@/lib/website-payload";

export const TemplateDefault = ({ payload }: { payload: unknown }) => {
  const meta = extractCmsPayloadMeta(payload);
  const title = meta?.title ?? "Untitled page";
  const excerpt = meta?.excerpt ?? null;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12 space-y-10">
      <header className="space-y-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Website</div>
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {excerpt ? <p className="text-lg text-muted-foreground max-w-2xl">{excerpt}</p> : null}
      </header>

      <CmsPayloadRenderer payload={payload} />
    </div>
  );
};
