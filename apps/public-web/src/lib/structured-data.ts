import { siteConfig } from "./site";

export type BreadcrumbItem = {
  name: string;
  url: string;
};

export const buildBreadcrumbList = (items: BreadcrumbItem[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

export const buildOrganizationSchema = (baseUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: baseUrl,
  logo: `${baseUrl}/icon-192x192.png`,
});

export const buildWebsiteSchema = (baseUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteConfig.name,
  url: baseUrl,
  potentialAction: {
    "@type": "SearchAction",
    target: `${baseUrl}/cms?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});

export const buildBlogPostingSchema = (input: {
  baseUrl: string;
  title: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string | null;
  speakable?: string[];
}) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: input.title,
  description: input.description,
  url: input.url,
  image: input.imageUrl ? [input.imageUrl] : undefined,
  datePublished: input.datePublished ?? undefined,
  dateModified: input.dateModified ?? undefined,
  author: {
    "@type": "Person",
    name: input.authorName ?? "Corely Author",
  },
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,
    logo: {
      "@type": "ImageObject",
      url: `${input.baseUrl}/icon-192x192.png`,
    },
  },
  speakable: input.speakable
    ? {
        "@type": "SpeakableSpecification",
        xpath: input.speakable,
      }
    : undefined,
});

export const buildCollectionSchema = (input: {
  url: string;
  name: string;
  description: string;
  items: Array<{ name: string; url: string }>;
}) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: input.name,
  description: input.description,
  url: input.url,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: item.url,
    })),
  },
});

export const buildWebPageSchema = (input: { url: string; name: string; description: string }) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: input.name,
  description: input.description,
  url: input.url,
});

export const buildFaqSchema = (items: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
});

export const buildRentalSchema = (input: {
  name: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: input.name,
  description: input.description,
  url: input.url,
  image: input.imageUrl ? [input.imageUrl] : undefined,
  offers:
    input.price && input.currency
      ? {
          "@type": "Offer",
          price: input.price,
          priceCurrency: input.currency,
          availability: "https://schema.org/InStock",
        }
      : undefined,
});
