import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService, EXT_KV_PORT, type ExtKvPort } from "@corely/data";
import { PublicBookingAddressSchema } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import { z } from "zod";
import { assertPublicModuleEnabled } from "../../../../shared/public";
import { toHttpException } from "../../../../shared/http/usecase-error.mapper";
import { OpenBukStudioUseCase } from "../../application/use-cases/openbuk-studio.usecase";
import {
  RESOURCE_REPOSITORY,
  SERVICE_REPOSITORY,
  type ResourceRepositoryPort,
  type ServiceRepositoryPort,
} from "../../application/ports/booking-repo.ports";
import type { ServiceOffering } from "../../domain/booking.entities";

const PUBLIC_BOOKING_SCOPE = (workspaceId: string) => `workspace:${workspaceId}`;
const PUBLIC_BOOKING_MODULE_ID = "booking";
const PUBLIC_BOOKING_SETTINGS_KEY = "public-page";

const PublicBookingPageConfigSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/i)
    .optional(),
  venueName: z.string().min(1).max(200).optional(),
  timezone: z.string().min(1).max(100).optional(),
  description: z.string().max(4000).optional().nullable(),
  openingHoursText: z.string().max(2000).optional().nullable(),
  cancellationPolicyText: z.string().max(2000).optional().nullable(),
  cancellationCutoffHours: z.number().int().nonnegative().optional().nullable(),
  depositPolicyText: z.string().max(2000).optional().nullable(),
  heroImageFileIds: z.array(z.string()).optional(),
  allowStaffSelection: z.boolean().optional(),
});

type PublicBookingPageConfig = z.infer<typeof PublicBookingPageConfigSchema>;

@Injectable()
export class LegacyPublicBookingPageReader {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EXT_KV_PORT) private readonly kv: ExtKvPort,
    @Inject(SERVICE_REPOSITORY) private readonly serviceRepo: ServiceRepositoryPort,
    @Inject(RESOURCE_REPOSITORY) private readonly resourceRepo: ResourceRepositoryPort,
    private readonly openBuk: OpenBukStudioUseCase
  ) {}

  async resolvePageData(slug: string, ctx: UseCaseContext) {
    const publishError = assertPublicModuleEnabled(ctx, "booking");
    if (publishError) {
      throw toHttpException(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      throw new NotFoundException("Public workspace not resolved");
    }

    await this.openBuk.assertLegacyPublicBookingAllowed(ctx);

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: ctx.workspaceId,
        tenantId: ctx.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        legalEntity: {
          select: {
            address: true,
          },
        },
        tenant: {
          select: {
            timeZone: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    const config = await this.getPublicPageConfig(ctx.tenantId, workspace.id);
    const effectiveSlug = (config.slug ?? workspace.slug ?? "booking").toLowerCase();

    if (slug.toLowerCase() !== effectiveSlug) {
      throw new NotFoundException("Public booking page not found");
    }

    const servicePage = await this.serviceRepo.findMany(
      ctx.tenantId,
      { isActive: true, workspaceId: workspace.id },
      1,
      200
    );
    const staffPage = await this.resourceRepo.findMany(
      ctx.tenantId,
      { type: "STAFF", isActive: true, workspaceId: workspace.id },
      1,
      200
    );

    const addressParsed = PublicBookingAddressSchema.safeParse(
      workspace.legalEntity?.address ?? null
    );
    const address = addressParsed.success ? addressParsed.data : null;

    const services = servicePage.items
      .filter((service) => service.isActive)
      .map((service) => this.toPublicService(service));

    const staff = staffPage.items
      .filter((resource) => resource.isActive)
      .map((resource) => ({
        id: resource.id,
        name: resource.name,
        description: resource.description,
        tags: resource.tags,
      }));

    const page = {
      slug: effectiveSlug,
      venueName: config.venueName ?? workspace.name,
      description: config.description ?? null,
      timezone: config.timezone ?? workspace.tenant?.timeZone ?? "UTC",
      address,
      openingHoursText: config.openingHoursText ?? null,
      cancellationPolicyText: config.cancellationPolicyText ?? null,
      cancellationCutoffHours: config.cancellationCutoffHours ?? null,
      depositPolicyText: config.depositPolicyText ?? null,
      heroImageFileIds: config.heroImageFileIds ?? [],
      allowStaffSelection: config.allowStaffSelection ?? staff.length > 0,
    };

    return {
      scope: { tenantId: ctx.tenantId, workspaceId: workspace.id },
      page,
      services,
      staff,
    };
  }

  private toPublicService(service: ServiceOffering) {
    const badges: string[] = [];
    if (service.depositCents && service.depositCents > 0) {
      badges.push("Deposit");
    }
    if (service.bufferBeforeMinutes > 0 || service.bufferAfterMinutes > 0) {
      badges.push("Buffered");
    }

    return {
      id: service.id,
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      currency: service.currency,
      depositCents: service.depositCents,
      category: service.requiredTags[0] ?? null,
      badges,
    };
  }

  private async getPublicPageConfig(
    tenantId: string,
    workspaceId: string
  ): Promise<PublicBookingPageConfig> {
    const entry = await this.kv.get({
      tenantId,
      moduleId: PUBLIC_BOOKING_MODULE_ID,
      scope: PUBLIC_BOOKING_SCOPE(workspaceId),
      key: PUBLIC_BOOKING_SETTINGS_KEY,
    });

    if (!entry?.value) {
      return {};
    }

    const parsed = PublicBookingPageConfigSchema.safeParse(entry.value);
    if (!parsed.success) {
      return {};
    }

    return parsed.data;
  }

  async resolveOwnerNotificationEmail(
    tenantId: string,
    workspaceId: string
  ): Promise<string | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        tenantId,
        deletedAt: null,
      },
      select: {
        legalEntity: {
          select: {
            email: true,
          },
        },
        memberships: {
          where: {
            status: "ACTIVE",
            role: {
              in: ["OWNER", "ADMIN"],
            },
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            role: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    const legalEmail = workspace?.legalEntity?.email?.trim();
    if (legalEmail) {
      return legalEmail;
    }

    const ownerMembership = workspace?.memberships.find(
      (membership) => membership.role === "OWNER" && Boolean(membership.user.email?.trim())
    );
    if (ownerMembership?.user.email) {
      return ownerMembership.user.email.trim();
    }

    const adminMembership = workspace?.memberships.find(
      (membership) => membership.role === "ADMIN" && Boolean(membership.user.email?.trim())
    );

    return adminMembership?.user.email?.trim() ?? null;
  }
}
