import sanitizeHtml from "sanitize-html";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import type { Extensions, JSONContent } from "@tiptap/core";

type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
};

const extensions: Extensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
  }),
  Image.configure({
    inline: false,
    allowBase64: false,
  }),
];

const DEFAULT_DOC: JSONContent = {
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [],
    },
  ],
};

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "blockquote",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "a",
  "img",
];

const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ["href", "target", "rel"],
  img: ["src", "alt", "title"],
};

const BLOCK_TYPES = new Set(["paragraph", "heading", "blockquote", "listItem"]);

export class CmsContentRenderer {
  render(contentJson: unknown): { html: string; text: string } {
    const doc = normalizeTiptapDoc(contentJson);
    const html = generateHTML(doc, extensions);
    const sanitized = sanitizeHtml(html, {
      allowedTags: ALLOWED_TAGS,
      allowedAttributes: ALLOWED_ATTRIBUTES,
      allowedSchemes: ["http", "https", "mailto"],
      allowProtocolRelative: false,
      transformTags: {
        a: (tagName, attribs) => ({
          tagName,
          attribs: {
            ...attribs,
            rel: "noopener noreferrer",
            target: attribs.target || "_blank",
          },
        }),
      },
    });

    const text = extractText(doc);
    return { html: sanitized, text };
  }
}

const normalizeTiptapDoc = (doc: unknown): JSONContent => {
  if (!isDocNode(doc)) {
    return DEFAULT_DOC;
  }
  return doc;
};

const isDocNode = (doc: unknown): doc is JSONContent => {
  if (!doc || typeof doc !== "object") {
    return false;
  }
  const candidate = doc as TiptapNode;
  return candidate.type === "doc" && Array.isArray(candidate.content);
};

const extractText = (doc: JSONContent): string => {
  const parts: string[] = [];

  const walk = (node: TiptapNode) => {
    if (!node) {
      return;
    }
    if (typeof node.text === "string") {
      parts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      node.content.forEach((child) => walk(child));
      if (typeof node.type === "string" && BLOCK_TYPES.has(node.type)) {
        parts.push("\n");
      }
    }
  };

  walk(doc as TiptapNode);

  return parts.join(" ").replace(/\s+/g, " ").trim();
};
