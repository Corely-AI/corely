import type { AccountStatus, CrmAccountType, AccountDto } from "@corely/contracts";

// ────────────────────────────────────────────
// CrmAccountProfile value-object (CRM-specific)
// ────────────────────────────────────────────
export interface AccountProfileProps {
  id: string;
  tenantId: string;
  partyId: string;
  accountType: CrmAccountType;
  status: AccountStatus;
  industry?: string;
  ownerUserId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ────────────────────────────────────────────
// Party snapshot (identity data for composition)
// ────────────────────────────────────────────
export interface PartySnapshot {
  id: string;
  tenantId: string;
  displayName: string;
  website?: string | null;
  industry?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
}

// ────────────────────────────────────────────
// AccountAggregate — composed read model
// ────────────────────────────────────────────
export class AccountAggregate {
  private constructor(
    public readonly profile: AccountProfileProps,
    public readonly party: PartySnapshot
  ) {}

  // Getters — expose composed view
  get id() {
    return this.profile.id;
  }
  get tenantId() {
    return this.profile.tenantId;
  }
  get partyId() {
    return this.party.id;
  }
  get name() {
    return this.party.displayName;
  }
  get website() {
    return this.party.website;
  }
  get email() {
    return this.party.primaryEmail;
  }
  get phone() {
    return this.party.primaryPhone;
  }
  get accountType() {
    return this.profile.accountType;
  }
  get status() {
    return this.profile.status;
  }
  get industry() {
    return this.profile.industry ?? this.party.industry ?? undefined;
  }
  get ownerUserId() {
    return this.profile.ownerUserId;
  }
  get notes() {
    return this.profile.notes;
  }
  get createdAt() {
    return this.profile.createdAt;
  }
  get updatedAt() {
    return this.profile.updatedAt;
  }

  /**
   * Compose from persistence (Party + CrmAccountProfile)
   */
  static compose(party: PartySnapshot, profile: AccountProfileProps): AccountAggregate {
    return new AccountAggregate(profile, party);
  }

  /**
   * Convert to DTO for API responses
   */
  toDto(): AccountDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      partyId: this.partyId,
      name: this.name,
      website: this.website,
      industry: this.industry,
      email: this.email,
      phone: this.phone,
      accountType: this.accountType,
      status: this.status,
      ownerUserId: this.ownerUserId,
      notes: this.notes,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
