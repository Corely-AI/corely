import { useEffect } from "react";
import { siteConfig } from "@/shared/lib/site";

interface SeoProps {
  title: string;
  description: string;
  canonicalPath?: string;
  ogImage?: string;
  type?: string;
  noIndex?: boolean;
}

function setMetaTag({
  name,
  property,
  content,
}: {
  name?: string;
  property?: string;
  content: string;
}) {
  const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
  let element = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement("meta");
    if (name) {
      element.setAttribute("name", name);
    }
    if (property) {
      element.setAttribute("property", property);
    }
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setCanonical(url: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

export function Seo({
  title,
  description,
  canonicalPath,
  ogImage = "/og-corely.png",
  type = "website",
  noIndex = false,
}: SeoProps) {
  useEffect(() => {
    const canonicalUrl = new URL(
      canonicalPath ?? window.location.pathname,
      siteConfig.siteUrl
    ).toString();

    document.title = title;
    setMetaTag({ name: "description", content: description });
    setMetaTag({ name: "author", content: siteConfig.name });
    setMetaTag({ name: "robots", content: noIndex ? "noindex, nofollow" : "index, follow" });

    setMetaTag({ property: "og:title", content: title });
    setMetaTag({ property: "og:description", content: description });
    setMetaTag({ property: "og:type", content: type });
    setMetaTag({ property: "og:image", content: ogImage });
    setMetaTag({ property: "og:url", content: canonicalUrl });

    setMetaTag({ name: "twitter:card", content: "summary_large_image" });
    setMetaTag({ name: "twitter:title", content: title });
    setMetaTag({ name: "twitter:description", content: description });
    setMetaTag({ name: "twitter:image", content: ogImage });

    setCanonical(canonicalUrl);
  }, [title, description, canonicalPath, ogImage, type, noIndex]);

  return null;
}
