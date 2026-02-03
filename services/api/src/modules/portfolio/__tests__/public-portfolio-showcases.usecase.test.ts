import { describe, expect, it } from "vitest";
import { ListPublicShowcasesUseCase } from "../application/use-cases/list-public-showcases.usecase";
import type {
  ShowcaseRepositoryPort,
  ShowcaseListFilters,
  ShowcaseListResult,
} from "../application/ports/showcase-repository.port";
import type { PortfolioShowcase } from "../domain/portfolio.types";
import { type UseCaseContext, isErr, unwrap } from "@corely/kernel";
import { PUBLIC_CONTEXT_METADATA_KEY } from "../../../shared/public";

class FakeShowcaseRepo implements ShowcaseRepositoryPort {
  constructor(private readonly showcases: PortfolioShowcase[]) {}

  async create(): Promise<PortfolioShowcase> {
    throw new Error("Not implemented");
  }

  async update(): Promise<PortfolioShowcase> {
    throw new Error("Not implemented");
  }

  async findById(): Promise<PortfolioShowcase | null> {
    return null;
  }

  async findBySlug(): Promise<PortfolioShowcase | null> {
    return null;
  }

  async findByDomain(): Promise<PortfolioShowcase | null> {
    return null;
  }

  async list(
    _tenantId: string,
    _workspaceId: string,
    _filters: ShowcaseListFilters,
    _pagination: { page: number; pageSize: number }
  ): Promise<ShowcaseListResult> {
    return { items: this.showcases, total: this.showcases.length };
  }

  async delete(): Promise<void> {
    return;
  }
}

const publicCtx = (overrides?: {
  tenantId?: string;
  workspaceId?: string;
  publicEnabled?: boolean;
  publicModules?: Record<string, boolean>;
}): UseCaseContext => ({
  tenantId: overrides?.tenantId ?? "tenant-1",
  workspaceId: overrides?.workspaceId ?? "workspace-1",
  metadata: {
    [PUBLIC_CONTEXT_METADATA_KEY]: {
      workspaceSlug: "acme",
      resolutionMethod: "path",
      publicEnabled: overrides?.publicEnabled ?? true,
      publicModules: overrides?.publicModules ?? { portfolio: true },
    },
  },
});

describe("ListPublicShowcasesUseCase", () => {
  it("returns published showcases for a public workspace", async () => {
    const repo = new FakeShowcaseRepo([
      {
        id: "showcase-1",
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        type: "company",
        name: "Studio",
        slug: "studio",
        primaryDomain: null,
        isPublished: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const useCase = new ListPublicShowcasesUseCase(repo);
    const result = await useCase.execute({}, publicCtx());
    const payload = unwrap(result);

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].slug).toBe("studio");
  });

  it("returns not found when public site is disabled", async () => {
    const repo = new FakeShowcaseRepo([]);
    const useCase = new ListPublicShowcasesUseCase(repo);
    const result = await useCase.execute({}, publicCtx({ publicEnabled: false }));
    expect(isErr(result)).toBe(true);
  });
});
