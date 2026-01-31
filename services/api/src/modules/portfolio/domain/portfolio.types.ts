export type PortfolioShowcaseType = "individual" | "company" | "hybrid";
export type PortfolioProjectType = "open_source" | "side_hustle" | "startup" | "agency" | "other";
export type PortfolioClientType = "cto" | "freelancer" | "partner" | "employer" | "other";
export type PortfolioContentStatus = "draft" | "published" | "archived";

export type PortfolioShowcase = {
  id: string;
  tenantId: string;
  workspaceId: string;
  type: PortfolioShowcaseType;
  name: string;
  slug: string;
  primaryDomain?: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PortfolioProfile = {
  id: string;
  tenantId: string;
  workspaceId: string;
  showcaseId: string;
  introLine?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  aboutShort?: string | null;
  aboutLong?: string | null;
  focusBullets: string[];
  ctaTitle?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  techStacks: string[];
  socialLinks?: Record<string, string> | null;
  homeSections: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type PortfolioProject = {
  id: string;
  tenantId: string;
  workspaceId: string;
  showcaseId: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  type: PortfolioProjectType;
  status: PortfolioContentStatus;
  featured: boolean;
  sortOrder?: number | null;
  coverImageUrl?: string | null;
  links?: Record<string, string> | null;
  techStack: string[];
  metrics?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PortfolioClient = {
  id: string;
  tenantId: string;
  workspaceId: string;
  showcaseId: string;
  name: string;
  slug: string;
  clientType: PortfolioClientType;
  locationText: string;
  websiteUrl?: string | null;
  logoImageUrl?: string | null;
  summary?: string | null;
  testimonialQuote?: string | null;
  testimonialAuthor?: string | null;
  featured: boolean;
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PortfolioService = {
  id: string;
  tenantId: string;
  workspaceId: string;
  showcaseId: string;
  name: string;
  slug: string;
  shortDescription: string;
  deliverables: string[];
  startingFromPrice?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  status: PortfolioContentStatus;
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PortfolioTeamMember = {
  id: string;
  tenantId: string;
  workspaceId: string;
  showcaseId: string;
  name: string;
  roleTitle: string;
  bio: string;
  skills: string[];
  photoUrl?: string | null;
  socialLinks?: Record<string, string> | null;
  status: PortfolioContentStatus;
  sortOrder?: number | null;
  createdAt: Date;
  updatedAt: Date;
};
