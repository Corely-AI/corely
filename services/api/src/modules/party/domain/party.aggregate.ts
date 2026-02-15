import { type Address } from "./address";
import { type ContactPoint, type ContactPointType, type SocialPlatform } from "./contact-point";
import { type PartyRoleType } from "./party-role";
import { type PartyKind } from "./party-kind";

export type PartyLifecycleStatus = "LEAD" | "ACTIVE" | "PAUSED" | "ARCHIVED";

type PartyProps = {
  id: string;
  tenantId: string;
  displayName: string;
  contactPoints: ContactPoint[];
  billingAddress: Address | null;
  vatId?: string | null;
  notes?: string | null;
  tags?: string[];
  lifecycleStatus: PartyLifecycleStatus;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: PartyRoleType[];
  // Phase 1: Contact/Company fields
  kind: PartyKind;
  firstName?: string | null;
  lastName?: string | null;
  organizationName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  industry?: string | null;
  website?: string | null;
  size?: string | null;
};

export type CustomerPatch = {
  displayName?: string;
  kind?: PartyKind;
  firstName?: string | null;
  lastName?: string | null;
  organizationName?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  industry?: string | null;
  website?: string | null;
  size?: string | null;
  email?: string | null;
  phone?: string | null;
  socialLinks?: Array<{
    platform: SocialPlatform;
    url: string;
    label?: string | null;
    isPrimary?: boolean;
  }> | null;
  billingAddress?: Address | null;
  vatId?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  lifecycleStatus?: PartyLifecycleStatus;
};

export class PartyAggregate {
  id: string;
  tenantId: string;
  displayName: string;
  contactPoints: ContactPoint[];
  billingAddress: Address | null;
  vatId: string | null;
  notes: string | null;
  tags: string[];
  lifecycleStatus: PartyLifecycleStatus;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: PartyRoleType[];
  kind: PartyKind;
  firstName: string | null;
  lastName: string | null;
  organizationName: string | null;
  jobTitle: string | null;
  department: string | null;
  industry: string | null;
  website: string | null;
  size: string | null;

  constructor(props: PartyProps) {
    if (!props.displayName.trim()) {
      throw new Error("Display name is required");
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.displayName = props.displayName.trim();
    this.contactPoints = props.contactPoints;
    this.billingAddress = props.billingAddress;
    this.vatId = props.vatId ?? null;
    this.notes = props.notes ?? null;
    this.tags = props.tags ?? [];
    this.lifecycleStatus = props.lifecycleStatus;
    this.archivedAt = props.archivedAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.roles = props.roles;
    this.kind = props.kind;
    this.firstName = props.firstName ?? null;
    this.lastName = props.lastName ?? null;
    this.organizationName = props.organizationName ?? null;
    this.jobTitle = props.jobTitle ?? null;
    this.department = props.department ?? null;
    this.industry = props.industry ?? null;
    this.website = props.website ?? null;
    this.size = props.size ?? null;
  }

  static createParty(params: {
    id: string;
    tenantId: string;
    displayName: string;
    roles: PartyRoleType[];
    email?: string | null;
    phone?: string | null;
    billingAddress?: Address | null;
    vatId?: string | null;
    notes?: string | null;
    tags?: string[];
    socialLinks?: Array<{
      platform: SocialPlatform;
      url: string;
      label?: string | null;
      isPrimary?: boolean;
    }>;
    lifecycleStatus?: PartyLifecycleStatus;
    createdAt: Date;
    generateId: () => string;
    // New fields
    kind?: PartyKind;
    firstName?: string | null;
    lastName?: string | null;
    organizationName?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    industry?: string | null;
    website?: string | null;
    size?: string | null;
  }) {
    if (params.roles.length === 0) {
      throw new Error("Party must have at least one role");
    }

    const aggregate = new PartyAggregate({
      id: params.id,
      tenantId: params.tenantId,
      displayName: params.displayName,
      contactPoints: [],
      billingAddress: null,
      vatId: params.vatId ?? null,
      notes: params.notes ?? null,
      tags: params.tags ?? [],
      lifecycleStatus: params.lifecycleStatus ?? "LEAD",
      archivedAt: null,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
      roles: params.roles,
      kind: params.kind ?? "INDIVIDUAL",
      firstName: params.firstName,
      lastName: params.lastName,
      organizationName: params.organizationName,
      jobTitle: params.jobTitle,
      department: params.department,
      industry: params.industry,
      website: params.website,
      size: params.size,
    });
    aggregate.setContactPoint("EMAIL", params.email ?? null, params.generateId);
    aggregate.setContactPoint("PHONE", params.phone ?? null, params.generateId);
    aggregate.setSocialLinks(params.socialLinks, params.generateId);
    aggregate.setBillingAddress(params.billingAddress ?? null, params.generateId);
    return aggregate;
  }

  static createCustomer(params: {
    id: string;
    tenantId: string;
    displayName: string;
    kind?: PartyKind; // Default INDIVIDUAL
    firstName?: string | null;
    lastName?: string | null;
    organizationName?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    industry?: string | null;
    website?: string | null;
    size?: string | null;
    email?: string | null;
    phone?: string | null;
    billingAddress?: Address | null;
    vatId?: string | null;
    notes?: string | null;
    tags?: string[];
    lifecycleStatus?: PartyLifecycleStatus;
    createdAt: Date;
    generateId: () => string;
  }) {
    // Logic: if kind is ORGANIZATION, ensure organizationName is set or use displayName
    let finalDisplayName = params.displayName;
    const finalKind = params.kind ?? "INDIVIDUAL";
    
    // Safety check: ensure displayName is not empty
    if (!finalDisplayName && finalKind === "INDIVIDUAL" && params.firstName && params.lastName) {
       finalDisplayName = `${params.firstName} ${params.lastName}`;
    } else if (!finalDisplayName && finalKind === "ORGANIZATION" && params.organizationName) {
       finalDisplayName = params.organizationName;
    }

    return PartyAggregate.createParty({
      ...params,
      displayName: finalDisplayName,
      roles: ["CUSTOMER"],
    });
  }

  updateCustomer(patch: CustomerPatch, now: Date, generateId: () => string) {
    if (this.archivedAt) {
      throw new Error("Archived customers cannot be updated");
    }

    if (patch.displayName !== undefined) {
      if (!patch.displayName.trim()) {
        throw new Error("Display name is required");
      }
      this.displayName = patch.displayName.trim();
    }
    if (patch.kind !== undefined) this.kind = patch.kind;
    if (patch.firstName !== undefined) this.firstName = patch.firstName ?? null;
    if (patch.lastName !== undefined) this.lastName = patch.lastName ?? null;
    if (patch.organizationName !== undefined) this.organizationName = patch.organizationName ?? null;
    if (patch.jobTitle !== undefined) this.jobTitle = patch.jobTitle ?? null;
    if (patch.department !== undefined) this.department = patch.department ?? null;
    if (patch.industry !== undefined) this.industry = patch.industry ?? null;
    if (patch.website !== undefined) this.website = patch.website ?? null;
    if (patch.size !== undefined) this.size = patch.size ?? null;

    this.setContactPoint("EMAIL", patch.email, generateId);
    this.setContactPoint("PHONE", patch.phone, generateId);
    this.setSocialLinks(patch.socialLinks, generateId);
    this.setBillingAddress(patch.billingAddress, generateId);

    if (patch.vatId !== undefined) {
      this.vatId = patch.vatId ?? null;
    }
    if (patch.notes !== undefined) {
      this.notes = patch.notes ?? null;
    }
    if (patch.tags !== undefined) {
      this.tags = patch.tags ?? [];
    }
    if (patch.lifecycleStatus !== undefined) {
      this.lifecycleStatus = patch.lifecycleStatus;
    }

    this.touch(now);
  }

  archive(now: Date) {
    if (!this.archivedAt) {
      this.archivedAt = now;
      this.touch(now);
    }
  }

  unarchive(now: Date) {
    if (this.archivedAt) {
      this.archivedAt = null;
      this.touch(now);
    }
  }

  addRole(role: PartyRoleType, now: Date) {
    if (this.archivedAt) {
      throw new Error("Cannot add role to archived party");
    }
    if (!this.roles.includes(role)) {
      this.roles.push(role);
      this.touch(now);
    }
  }

  removeRole(role: PartyRoleType, now: Date) {
    if (this.archivedAt) {
      throw new Error("Cannot remove role from archived party");
    }
    if (this.roles.length <= 1) {
      throw new Error("Party must have at least one role");
    }
    const index = this.roles.indexOf(role);
    if (index >= 0) {
      this.roles.splice(index, 1);
      this.touch(now);
    }
  }

  hasRole(role: PartyRoleType): boolean {
    return this.roles.includes(role);
  }

  get primaryEmail(): string | undefined {
    return this.contactPoints.find((cp) => cp.type === "EMAIL" && cp.isPrimary)?.value;
  }

  get primaryPhone(): string | undefined {
    return this.contactPoints.find((cp) => cp.type === "PHONE" && cp.isPrimary)?.value;
  }

  get socialLinks(): Array<{
    id: string;
    platform: SocialPlatform;
    url: string;
    label?: string | null;
    isPrimary: boolean;
  }> {
    return this.contactPoints
      .filter((cp) => cp.type === "SOCIAL" && !!cp.platform)
      .map((cp) => ({
        id: cp.id,
        platform: cp.platform as SocialPlatform,
        url: cp.value,
        label: cp.label ?? null,
        isPrimary: cp.isPrimary,
      }));
  }

  private setContactPoint(
    type: Extract<ContactPointType, "EMAIL" | "PHONE">,
    value: string | null | undefined,
    generateId: () => string
  ) {
    if (value === undefined) {
      return;
    }

    const trimmed = value === null ? null : value.trim();
    const existingIndex = this.contactPoints.findIndex((cp) => cp.type === type);

    if (trimmed === null || trimmed === "") {
      if (existingIndex >= 0) {
        this.contactPoints.splice(existingIndex, 1);
      }
      return;
    }

    if (existingIndex >= 0) {
      const existing = this.contactPoints[existingIndex];
      this.contactPoints[existingIndex] = { ...existing, value: trimmed, isPrimary: true };
    } else {
      this.contactPoints.push({
        id: generateId(),
        type,
        value: trimmed,
        isPrimary: true,
      });
    }

    this.contactPoints = this.contactPoints.map((cp, index) => {
      if (cp.type !== type) {
        return cp;
      }
      return index === this.contactPoints.findIndex((p) => p.type === type)
        ? cp
        : { ...cp, isPrimary: false };
    });
  }

  private setSocialLinks(
    links:
      | Array<{ platform: SocialPlatform; url: string; label?: string | null; isPrimary?: boolean }>
      | null
      | undefined,
    generateId: () => string
  ) {
    if (links === undefined) {
      return;
    }

    this.contactPoints = this.contactPoints.filter((cp) => cp.type !== "SOCIAL");
    if (!links || links.length === 0) {
      return;
    }

    const normalized = links
      .map((link) => ({
        platform: link.platform,
        url: link.url.trim(),
        label: link.label?.trim() || null,
        isPrimary: Boolean(link.isPrimary),
      }))
      .filter((link) => !!link.url);

    if (normalized.length === 0) {
      return;
    }

    const primaryIndex = normalized.findIndex((link) => link.isPrimary);
    const effectivePrimaryIndex = primaryIndex >= 0 ? primaryIndex : 0;

    normalized.forEach((link, index) => {
      this.contactPoints.push({
        id: generateId(),
        type: "SOCIAL",
        value: link.url,
        platform: link.platform,
        label: link.label,
        isPrimary: index === effectivePrimaryIndex,
      });
    });
  }

  private setBillingAddress(address: Address | null | undefined, generateId: () => string) {
    if (address === undefined) {
      return;
    }
    if (address === null) {
      this.billingAddress = null;
      return;
    }

    const currentId = this.billingAddress?.id;
    this.billingAddress = {
      ...address,
      id: currentId ?? address.id ?? generateId(),
      type: "BILLING",
      line1: address.line1,
      line2: address.line2 ?? null,
      city: address.city ?? null,
      postalCode: address.postalCode ?? null,
      country: address.country ?? null,
    };
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
