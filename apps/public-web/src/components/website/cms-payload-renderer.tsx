import React from "react";
import {
  extractBlocksPayload,
  extractCmsPayloadMeta,
  extractHtmlPayload,
  extractTextPayload,
  type WebsiteBlock,
} from "@/lib/website-payload";

type BlockRendererProps = {
  block: WebsiteBlock;
};

const ALLOWED_BLOCK_TYPES = new Set(["heading", "paragraph", "list", "image", "quote", "cta"]);

const BlockRenderer = ({ block }: BlockRendererProps) => {
  if (!block.type || !ALLOWED_BLOCK_TYPES.has(block.type)) {
    return null;
  }

  switch (block.type) {
    case "heading": {
      const level = typeof block.level === "number" ? block.level : 2;
      const text = typeof block.text === "string" ? block.text : "";
      const Tag = (level >= 1 && level <= 3 ? `h${level}` : "h2") as keyof JSX.IntrinsicElements;
      return <Tag className="mt-10 text-3xl font-semibold tracking-tight">{text}</Tag>;
    }
    case "paragraph": {
      const text = typeof block.text === "string" ? block.text : "";
      return <p className="text-lg text-muted-foreground leading-relaxed">{text}</p>;
    }
    case "list": {
      const items = Array.isArray(block.items) ? block.items : [];
      return (
        <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
          {items.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      );
    }
    case "image": {
      const src = typeof block.src === "string" ? block.src : "";
      if (!src) {
        return null;
      }
      const alt = typeof block.alt === "string" ? block.alt : "";
      return <img src={src} alt={alt} className="w-full rounded-3xl shadow-lg" />;
    }
    case "quote": {
      const text = typeof block.text === "string" ? block.text : "";
      return (
        <blockquote className="border-l-4 border-accent pl-4 text-xl italic text-foreground/80">
          {text}
        </blockquote>
      );
    }
    case "cta": {
      const label = typeof block.label === "string" ? block.label : "Learn more";
      const url = typeof block.url === "string" ? block.url : "#";
      return (
        <a
          href={url}
          className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition hover:opacity-90"
        >
          {label}
        </a>
      );
    }
    default:
      return null;
  }
};

export const CmsPayloadRenderer = ({ payload }: { payload: unknown }) => {
  const html = extractHtmlPayload(payload);
  if (html) {
    // HTML is sanitized on the server via CMS renderer; safe to render here.
    return (
      <div
        className="prose prose-lg max-w-none prose-headings:font-semibold prose-a:text-accent prose-img:rounded-2xl"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const blocks = extractBlocksPayload(payload);
  if (blocks.length) {
    return (
      <div className="space-y-6">
        {blocks.map((block, index) => (
          <BlockRenderer key={`${block.type ?? "block"}-${index}`} block={block} />
        ))}
      </div>
    );
  }

  const meta = extractCmsPayloadMeta(payload);
  if (meta?.contentJson) {
    const text = extractTextPayload(payload);
    if (text) {
      return <p className="text-lg text-muted-foreground leading-relaxed">{text}</p>;
    }
  }

  return (
    <p className="text-sm text-muted-foreground">This page does not have content to display yet.</p>
  );
};
