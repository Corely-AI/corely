export const siteConfig = {
  name: "Corely",
  tagline: "Run your business, clearly.",
  description: "Corely connects solo and team operations in one workspace with the apps you need.",
  siteUrl: import.meta.env.VITE_SITE_URL || "https://corely.one",
  social: {
    github: "https://github.com/Corely-AI/corely",
    docs: "https://docs.corely.one",
  },
};

export const primaryNav = [
  { label: "freelancer", href: "/freelancer" },
  { label: "company", href: "/company" },
  { label: "developers", href: "/developers" },
] as const;

export const footerNav = {
  product: [
    { label: "home", href: "/" },
    { label: "freelancer", href: "/freelancer" },
    { label: "company", href: "/company" },
  ],
  platform: [
    { label: "developers", href: "/developers" },
    { label: "requestAccess", href: "mailto:hello@corely.one" },
    { label: "GitHub", href: "https://github.com/Corely-AI/corely" },
  ],
  legal: [
    { label: "privacy", href: "/privacy" },
    { label: "terms", href: "/terms" },
  ],
} as const;
