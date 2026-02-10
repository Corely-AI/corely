import type {
  Workspace,
  WorkspaceMembership,
  LegalEntity,
  WorkspaceDomain,
} from "../../domain/workspace.entity";

export interface CreateLegalEntityInput {
  id: string;
  tenantId: string;
  kind: string;
  legalName: string;
  countryCode: string;
  currency: string;
  taxId?: string;
  vatId?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: any;
  bankAccount?: any;
}

export interface CreateWorkspaceInput {
  id: string;
  tenantId: string;
  legalEntityId: string;
  name: string;
  slug?: string;
  publicEnabled?: boolean;
  publicModules?: Record<string, boolean> | null;
  onboardingStatus?: string;
  invoiceSettings?: any;
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  publicEnabled?: boolean;
  publicModules?: Record<string, boolean> | null;
  onboardingStatus?: string;
  onboardingCompletedAt?: Date;
  invoiceSettings?: any;
}

export interface UpdateLegalEntityInput {
  kind?: string;
  legalName?: string;
  countryCode?: string;
  currency?: string;
  taxId?: string;
  vatId?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: any;
  bankAccount?: any;
}

export interface CreateMembershipInput {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  status?: string;
}

export interface WorkspaceRepositoryPort {
  // Legal Entity operations
  createLegalEntity(input: CreateLegalEntityInput): Promise<LegalEntity>;
  getLegalEntityById(tenantId: string, id: string): Promise<LegalEntity | null>;
  updateLegalEntity(
    tenantId: string,
    id: string,
    input: UpdateLegalEntityInput
  ): Promise<LegalEntity>;

  // Workspace operations
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  getWorkspaceBySlug(slug: string): Promise<Workspace | null>;
  getWorkspaceById(tenantId: string, id: string): Promise<Workspace | null>;
  getWorkspaceByIdWithLegalEntity(tenantId: string, id: string): Promise<Workspace | null>;
  listWorkspacesByTenant(tenantId: string, userId: string): Promise<Workspace[]>;
  updateWorkspace(tenantId: string, id: string, input: UpdateWorkspaceInput): Promise<Workspace>;
  softDeleteWorkspace(tenantId: string, id: string): Promise<void>;

  // Membership operations
  createMembership(input: CreateMembershipInput): Promise<WorkspaceMembership>;
  getMembershipByUserAndWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMembership | null>;
  listMembershipsByWorkspace(workspaceId: string): Promise<WorkspaceMembership[]>;
  checkUserHasWorkspaceAccess(
    tenantId: string,
    workspaceId: string,
    userId: string
  ): Promise<boolean>;

  // Workspace domain operations
  listWorkspaceDomains(workspaceId: string): Promise<WorkspaceDomain[]>;
  createWorkspaceDomain(input: {
    id: string;
    workspaceId: string;
    domain: string;
    isPrimary: boolean;
  }): Promise<WorkspaceDomain>;
  deleteWorkspaceDomain(workspaceId: string, domainId: string): Promise<boolean>;
  setPrimaryWorkspaceDomain(workspaceId: string, domainId: string): Promise<WorkspaceDomain | null>;
}

export const WORKSPACE_REPOSITORY_PORT = "workspaces/workspace-repository";
