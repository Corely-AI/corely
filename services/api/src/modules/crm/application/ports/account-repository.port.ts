import type { AccountAggregate, AccountProfileProps } from "../../domain/account.aggregate";
import type { AccountStatus, CrmAccountType } from "@corely/contracts";

export interface AccountFilters {
  status?: AccountStatus;
  accountType?: CrmAccountType;
  ownerUserId?: string;
  q?: string; // search query across Party.displayName, email, phone
}

export interface AccountRepositoryPort {
  /** Create a CRM account profile (Party already exists) */
  createProfile(profile: AccountProfileProps): Promise<void>;

  /** Update CRM account profile fields */
  updateProfile(profile: AccountProfileProps): Promise<void>;

  /** Get composed Account (Party + Profile) by profile ID */
  findById(tenantId: string, id: string): Promise<AccountAggregate | null>;

  /** Get composed Account by Party ID */
  findByPartyId(tenantId: string, partyId: string): Promise<AccountAggregate | null>;

  /** List composed Accounts with filtering and pagination */
  list(
    tenantId: string,
    filters: AccountFilters,
    pagination: { page: number; pageSize: number; sortBy?: string; sortOrder?: "asc" | "desc" }
  ): Promise<{ items: AccountAggregate[]; total: number }>;
}

export const ACCOUNT_REPO_PORT = Symbol("ACCOUNT_REPO_PORT");
