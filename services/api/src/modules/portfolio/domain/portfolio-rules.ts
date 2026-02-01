import { ValidationError } from "@corely/kernel";
import type {
  PortfolioContentStatus,
  PortfolioProject,
  PortfolioService,
  PortfolioTeamMember,
  PortfolioShowcaseType,
  PortfolioProfile,
} from "./portfolio.types";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const assertValidSlug = (slug: string) => {
  if (!SLUG_REGEX.test(slug)) {
    throw new ValidationError("slug must be kebab-case");
  }
};

export const assertCompanyMode = (type: PortfolioShowcaseType) => {
  if (type === "individual") {
    throw new ValidationError("Company-only feature for individual showcases");
  }
};

export const assertPublishableProfile = (profile: Partial<PortfolioProfile>) => {
  if (!profile.headline || !profile.headline.trim()) {
    throw new ValidationError("headline is required to publish profile");
  }
  if (!profile.aboutShort || !profile.aboutShort.trim()) {
    throw new ValidationError("aboutShort is required to publish profile");
  }
};

export const assertPublishableProject = (project: Partial<PortfolioProject>) => {
  if (!project.title || !project.title.trim()) {
    throw new ValidationError("title is required to publish project");
  }
  if (!project.summary || !project.summary.trim()) {
    throw new ValidationError("summary is required to publish project");
  }
  if (!project.content || !project.content.trim()) {
    throw new ValidationError("content is required to publish project");
  }
};

export const assertPublishableService = (service: Partial<PortfolioService>) => {
  if (!service.name || !service.name.trim()) {
    throw new ValidationError("name is required to publish service");
  }
  if (!service.shortDescription || !service.shortDescription.trim()) {
    throw new ValidationError("shortDescription is required to publish service");
  }
};

export const assertPublishableTeamMember = (member: Partial<PortfolioTeamMember>) => {
  if (!member.name || !member.name.trim()) {
    throw new ValidationError("name is required to publish team member");
  }
  if (!member.roleTitle || !member.roleTitle.trim()) {
    throw new ValidationError("roleTitle is required to publish team member");
  }
  if (!member.bio || !member.bio.trim()) {
    throw new ValidationError("bio is required to publish team member");
  }
};

export const shouldPublish = (status?: PortfolioContentStatus) => status === "published";
