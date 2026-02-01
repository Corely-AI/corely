import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { PortfolioProfile } from "../../domain/portfolio.types";
import type { PortfolioProfile as PortfolioProfileModel } from "@prisma/client";
import type { ProfileRepositoryPort } from "../../application/ports/profile-repository.port";

const mapProfile = (row: PortfolioProfileModel): PortfolioProfile => ({
  id: row.id,
  tenantId: row.tenantId,
  workspaceId: row.workspaceId,
  showcaseId: row.showcaseId,
  introLine: row.introLine,
  headline: row.headline,
  subheadline: row.subheadline,
  aboutShort: row.aboutShort,
  aboutLong: row.aboutLong,
  focusBullets: row.focusBullets ?? [],
  ctaTitle: row.ctaTitle,
  ctaText: row.ctaText,
  ctaUrl: row.ctaUrl,
  techStacks: row.techStacks ?? [],
  socialLinks: row.socialLinks as Record<string, string> | null,
  homeSections: row.homeSections ?? [],
  isPublished: row.isPublished,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaProfileRepository implements ProfileRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByShowcaseId(
    tenantId: string,
    workspaceId: string,
    showcaseId: string
  ): Promise<PortfolioProfile | null> {
    const row = await this.prisma.portfolioProfile.findFirst({
      where: { tenantId, workspaceId, showcaseId },
    });
    return row ? mapProfile(row) : null;
  }

  async upsert(
    profile: Omit<PortfolioProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ): Promise<PortfolioProfile> {
    const row = await this.prisma.portfolioProfile.upsert({
      where: { showcaseId: profile.showcaseId },
      update: {
        introLine: profile.introLine ?? null,
        headline: profile.headline ?? null,
        subheadline: profile.subheadline ?? null,
        aboutShort: profile.aboutShort ?? null,
        aboutLong: profile.aboutLong ?? null,
        focusBullets: profile.focusBullets ?? [],
        ctaTitle: profile.ctaTitle ?? null,
        ctaText: profile.ctaText ?? null,
        ctaUrl: profile.ctaUrl ?? null,
        techStacks: profile.techStacks ?? [],
        socialLinks: profile.socialLinks ?? null,
        homeSections: profile.homeSections ?? [],
        isPublished: profile.isPublished,
      },
      create: {
        tenantId: profile.tenantId,
        workspaceId: profile.workspaceId,
        showcaseId: profile.showcaseId,
        introLine: profile.introLine ?? null,
        headline: profile.headline ?? null,
        subheadline: profile.subheadline ?? null,
        aboutShort: profile.aboutShort ?? null,
        aboutLong: profile.aboutLong ?? null,
        focusBullets: profile.focusBullets ?? [],
        ctaTitle: profile.ctaTitle ?? null,
        ctaText: profile.ctaText ?? null,
        ctaUrl: profile.ctaUrl ?? null,
        techStacks: profile.techStacks ?? [],
        socialLinks: profile.socialLinks ?? null,
        homeSections: profile.homeSections ?? [],
        isPublished: profile.isPublished,
      },
    });
    return mapProfile(row);
  }
}
