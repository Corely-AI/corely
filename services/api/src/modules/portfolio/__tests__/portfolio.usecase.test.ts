import { describe, expect, it } from "vitest";
import { CreateShowcaseUseCase } from "../application/use-cases/create-showcase.usecase";
import { GetPublicShowcaseUseCase } from "../application/use-cases/get-public-showcase.usecase";
import { SetProjectClientsUseCase } from "../application/use-cases/set-project-clients.usecase";
import type {
  ShowcaseRepositoryPort,
  ShowcaseListFilters,
  ShowcaseListResult,
} from "../application/ports/showcase-repository.port";
import type { ProfileRepositoryPort } from "../application/ports/profile-repository.port";
import type {
  ProjectRepositoryPort,
  ProjectListFilters,
  ProjectListResult,
} from "../application/ports/project-repository.port";
import type {
  ClientRepositoryPort,
  ClientListFilters,
  ClientListResult,
} from "../application/ports/client-repository.port";
import type {
  ServiceRepositoryPort,
  ServiceListFilters,
  ServiceListResult,
} from "../application/ports/service-repository.port";
import type {
  TeamRepositoryPort,
  TeamListFilters,
  TeamListResult,
} from "../application/ports/team-repository.port";
import type {
  PortfolioClient,
  PortfolioContentStatus,
  PortfolioProfile,
  PortfolioProject,
  PortfolioProjectType,
  PortfolioService,
  PortfolioShowcase,
  PortfolioShowcaseType,
  PortfolioTeamMember,
} from "../domain/portfolio.types";

class FakeShowcaseRepo implements ShowcaseRepositoryPort {
  showcases: PortfolioShowcase[] = [];

  async create(
    input: Omit<PortfolioShowcase, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioShowcase> {
    const showcase: PortfolioShowcase = {
      ...input,
      id: "showcase-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.showcases.push(showcase);
    return showcase;
  }

  async update(
    _tenantId: string,
    _workspaceId: string,
    _showcaseId: string,
    _input: Partial<
      Omit<PortfolioShowcase, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioShowcase> {
    throw new Error("Not implemented");
  }

  async findById(
    _tenantId: string,
    _workspaceId: string,
    _showcaseId: string
  ): Promise<PortfolioShowcase | null> {
    return null;
  }

  async findBySlug(
    tenantId: string,
    workspaceId: string,
    slug: string,
    opts?: { publishedOnly?: boolean }
  ): Promise<PortfolioShowcase | null> {
    const match = this.showcases.find(
      (item) => item.tenantId === tenantId && item.workspaceId === workspaceId && item.slug === slug
    );
    if (!match) {
      return null;
    }
    if (opts?.publishedOnly && !match.isPublished) {
      return null;
    }
    return match;
  }

  async list(
    _tenantId: string,
    _workspaceId: string,
    _filters: ShowcaseListFilters,
    _pagination: { page: number; pageSize: number }
  ): Promise<ShowcaseListResult> {
    return { items: [], total: 0 };
  }

  async delete(_tenantId: string, _workspaceId: string, _showcaseId: string): Promise<void> {
    return;
  }
}

class FakeProfileRepo implements ProfileRepositoryPort {
  async findByShowcaseId(
    _tenantId: string,
    _workspaceId: string,
    _showcaseId: string
  ): Promise<PortfolioProfile | null> {
    return null;
  }
  async upsert(
    _profile: Omit<PortfolioProfile, "id" | "createdAt" | "updatedAt"> & { id?: string }
  ): Promise<PortfolioProfile> {
    throw new Error("Not implemented");
  }
}

class FakeProjectRepo implements ProjectRepositoryPort {
  projects: PortfolioProject[] = [];
  lastSetClientIds: string[] = [];

  async create(
    _input: Omit<PortfolioProject, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioProject> {
    throw new Error("Not implemented");
  }

  async update(
    _tenantId: string,
    _workspaceId: string,
    _projectId: string,
    _input: Partial<
      Omit<PortfolioProject, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioProject> {
    throw new Error("Not implemented");
  }

  async findById(
    tenantId: string,
    workspaceId: string,
    projectId: string
  ): Promise<PortfolioProject | null> {
    return (
      this.projects.find(
        (project) =>
          project.tenantId === tenantId &&
          project.workspaceId === workspaceId &&
          project.id === projectId
      ) ?? null
    );
  }

  async findBySlug(
    _showcaseId: string,
    _slug: string,
    _opts?: { publishedOnly?: boolean }
  ): Promise<PortfolioProject | null> {
    return null;
  }

  async listByShowcase(
    _tenantId: string,
    _workspaceId: string,
    _showcaseId: string,
    _filters: ProjectListFilters,
    _pagination: { page: number; pageSize: number }
  ): Promise<ProjectListResult> {
    return { items: [], total: 0 };
  }

  async delete(_tenantId: string, _workspaceId: string, _projectId: string): Promise<void> {
    return;
  }

  async setClients(
    _tenantId: string,
    _workspaceId: string,
    _projectId: string,
    clientIds: string[]
  ): Promise<void> {
    this.lastSetClientIds = clientIds;
  }

  async listClientIds(
    _tenantId: string,
    _workspaceId: string,
    _projectId: string
  ): Promise<string[]> {
    return [];
  }
}

class FakeClientRepo implements ClientRepositoryPort {
  clients: PortfolioClient[] = [];

  async create(
    _input: Omit<PortfolioClient, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioClient> {
    throw new Error("Not implemented");
  }

  async update(
    _tenantId: string,
    _workspaceId: string,
    _clientId: string,
    _input: Partial<
      Omit<PortfolioClient, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioClient> {
    throw new Error("Not implemented");
  }

  async findById(
    _tenantId: string,
    _workspaceId: string,
    _clientId: string
  ): Promise<PortfolioClient | null> {
    return null;
  }

  async findBySlug(_showcaseId: string, _slug: string): Promise<PortfolioClient | null> {
    return null;
  }

  async listByShowcase(
    _tenantId: string,
    _workspaceId: string,
    _showcaseId: string,
    _filters: ClientListFilters,
    _pagination: { page: number; pageSize: number }
  ): Promise<ClientListResult> {
    return { items: [], total: 0 };
  }

  async delete(_tenantId: string, _workspaceId: string, _clientId: string): Promise<void> {
    return;
  }

  async findByIds(
    tenantId: string,
    workspaceId: string,
    clientIds: string[]
  ): Promise<PortfolioClient[]> {
    return this.clients.filter(
      (client) =>
        client.tenantId === tenantId &&
        client.workspaceId === workspaceId &&
        clientIds.includes(client.id)
    );
  }
}

class FakeServiceRepo implements ServiceRepositoryPort {
  async create(
    _input: Omit<PortfolioService, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioService> {
    throw new Error("Not implemented");
  }
  async update(
    _tenantId: string,
    _workspaceId: string,
    _serviceId: string,
    _input: Partial<
      Omit<PortfolioService, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioService> {
    throw new Error("Not implemented");
  }
  async findById(
    _tenantId: string,
    _workspaceId: string,
    _serviceId: string
  ): Promise<PortfolioService | null> {
    return null;
  }
  async findBySlug(_showcaseId: string, _slug: string): Promise<PortfolioService | null> {
    return null;
  }
  async listByShowcase(
    _tenantId: string,
    _workspaceId: string,
    _showcaseId: string,
    _filters: ServiceListFilters,
    _pagination: { page: number; pageSize: number }
  ): Promise<ServiceListResult> {
    return { items: [], total: 0 };
  }
  async delete(_tenantId: string, _workspaceId: string, _serviceId: string): Promise<void> {
    return;
  }
}

class FakeTeamRepo implements TeamRepositoryPort {
  async create(
    _input: Omit<PortfolioTeamMember, "id" | "createdAt" | "updatedAt">
  ): Promise<PortfolioTeamMember> {
    throw new Error("Not implemented");
  }
  async update(
    _tenantId: string,
    _workspaceId: string,
    _memberId: string,
    _input: Partial<
      Omit<PortfolioTeamMember, "id" | "tenantId" | "workspaceId" | "createdAt" | "updatedAt">
    >
  ): Promise<PortfolioTeamMember> {
    throw new Error("Not implemented");
  }
  async findById(
    _tenantId: string,
    _workspaceId: string,
    _memberId: string
  ): Promise<PortfolioTeamMember | null> {
    return null;
  }
  async listByShowcase(
    _tenantId: string,
    _workspaceId: string,
    _showcaseId: string,
    _filters: TeamListFilters,
    _pagination: { page: number; pageSize: number }
  ): Promise<TeamListResult> {
    return { items: [], total: 0 };
  }
  async delete(_tenantId: string, _workspaceId: string, _memberId: string): Promise<void> {
    return;
  }
}

const buildShowcase = (overrides: Partial<PortfolioShowcase> = {}): PortfolioShowcase => ({
  id: overrides.id ?? "showcase-1",
  tenantId: overrides.tenantId ?? "tenant-1",
  workspaceId: overrides.workspaceId ?? "workspace-1",
  type: (overrides.type ?? "individual") as PortfolioShowcaseType,
  name: overrides.name ?? "Showcase",
  slug: overrides.slug ?? "oneway8x",
  primaryDomain: overrides.primaryDomain ?? null,
  isPublished: overrides.isPublished ?? false,
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

const buildProject = (overrides: Partial<PortfolioProject> = {}): PortfolioProject => ({
  id: overrides.id ?? "project-1",
  tenantId: overrides.tenantId ?? "tenant-1",
  workspaceId: overrides.workspaceId ?? "workspace-1",
  showcaseId: overrides.showcaseId ?? "showcase-1",
  title: overrides.title ?? "Project",
  slug: overrides.slug ?? "project",
  summary: overrides.summary ?? "Summary",
  content: overrides.content ?? "Content",
  type: (overrides.type ?? "startup") as PortfolioProjectType,
  status: (overrides.status ?? "draft") as PortfolioContentStatus,
  featured: overrides.featured ?? false,
  sortOrder: overrides.sortOrder ?? null,
  coverImageUrl: overrides.coverImageUrl ?? null,
  links: overrides.links ?? null,
  techStack: overrides.techStack ?? [],
  metrics: overrides.metrics ?? null,
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

const buildClient = (overrides: Partial<PortfolioClient> = {}): PortfolioClient => ({
  id: overrides.id ?? "client-1",
  tenantId: overrides.tenantId ?? "tenant-1",
  workspaceId: overrides.workspaceId ?? "workspace-1",
  showcaseId: overrides.showcaseId ?? "showcase-1",
  name: overrides.name ?? "Client",
  slug: overrides.slug ?? "client",
  clientType: overrides.clientType ?? "partner",
  locationText: overrides.locationText ?? "Remote",
  websiteUrl: overrides.websiteUrl ?? null,
  logoImageUrl: overrides.logoImageUrl ?? null,
  summary: overrides.summary ?? null,
  testimonialQuote: overrides.testimonialQuote ?? null,
  testimonialAuthor: overrides.testimonialAuthor ?? null,
  featured: overrides.featured ?? false,
  sortOrder: overrides.sortOrder ?? null,
  createdAt: overrides.createdAt ?? new Date(),
  updatedAt: overrides.updatedAt ?? new Date(),
});

describe("Portfolio use cases", () => {
  it("rejects duplicate showcase slug", async () => {
    const repo = new FakeShowcaseRepo();
    repo.showcases.push(buildShowcase({ slug: "oneway8x", isPublished: true }));

    const useCase = new CreateShowcaseUseCase(repo);
    const result = await useCase.execute(
      { type: "individual", name: "Test", slug: "oneway8x" },
      { tenantId: "tenant-1", workspaceId: "workspace-1", userId: "user-1" }
    );

    expect(result.ok).toBe(false);
  });

  it("blocks public showcase when not published", async () => {
    const showcaseRepo = new FakeShowcaseRepo();
    showcaseRepo.showcases.push(buildShowcase({ isPublished: false }));

    const useCase = new GetPublicShowcaseUseCase(
      showcaseRepo,
      new FakeProfileRepo(),
      new FakeProjectRepo(),
      new FakeClientRepo(),
      new FakeServiceRepo(),
      new FakeTeamRepo()
    );

    const result = await useCase.execute(
      { slug: "oneway8x" },
      { tenantId: "tenant-1", workspaceId: "workspace-1" }
    );

    expect(result.ok).toBe(false);
  });

  it("updates project client assignments", async () => {
    const projectRepo = new FakeProjectRepo();
    const clientRepo = new FakeClientRepo();

    projectRepo.projects.push(buildProject({ id: "project-1" }));
    clientRepo.clients.push(buildClient({ id: "client-1" }), buildClient({ id: "client-2" }));

    const useCase = new SetProjectClientsUseCase(projectRepo, clientRepo);
    const result = await useCase.execute(
      { projectId: "project-1", clientIds: ["client-1", "client-2"] },
      { tenantId: "tenant-1", workspaceId: "workspace-1", userId: "user-1" }
    );

    expect(result.ok).toBe(true);
    expect(projectRepo.lastSetClientIds).toEqual(["client-1", "client-2"]);
  });
});
