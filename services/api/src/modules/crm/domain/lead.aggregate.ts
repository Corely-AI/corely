export type LeadStatus = "NEW" | "QUALIFIED" | "DISQUALIFIED" | "CONVERTED";
export type LeadSource = "WEB_FORM" | "MANUAL" | "IMPORT" | "REFERRAL" | "OTHER";

type LeadProps = {
  id: string;
  tenantId: string;
  source: LeadSource;
  status: LeadStatus;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  ownerUserId: string | null;
  convertedDealId: string | null;
  convertedPartyId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class LeadAggregate {
  id: string;
  tenantId: string;
  source: LeadSource;
  status: LeadStatus;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  ownerUserId: string | null;
  convertedDealId: string | null;
  convertedPartyId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: LeadProps) {
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.source = props.source;
    this.status = props.status;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.companyName = props.companyName;
    this.email = props.email;
    this.phone = props.phone;
    this.ownerUserId = props.ownerUserId;
    this.convertedDealId = props.convertedDealId;
    this.convertedPartyId = props.convertedPartyId;
    this.notes = props.notes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(params: {
    id: string;
    tenantId: string;
    source?: LeadSource;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
    ownerUserId?: string | null;
    notes?: string | null;
    createdAt: Date;
  }) {
    return new LeadAggregate({
      id: params.id,
      tenantId: params.tenantId,
      source: params.source ?? "MANUAL",
      status: "NEW",
      firstName: params.firstName ?? null,
      lastName: params.lastName ?? null,
      companyName: params.companyName ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      ownerUserId: params.ownerUserId ?? null,
      convertedDealId: null,
      convertedPartyId: null,
      notes: params.notes ?? null,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
    });
  }

  qualify(now: Date) {
    if (this.status === "CONVERTED") {
      throw new Error("Cannot qualify a converted lead");
    }
    this.status = "QUALIFIED";
    this.updatedAt = now;
  }

  disqualify(now: Date) {
    if (this.status === "CONVERTED") {
      throw new Error("Cannot disqualify a converted lead");
    }
    this.status = "DISQUALIFIED";
    this.updatedAt = now;
  }

  convert(dealId: string, partyId: string, now: Date) {
    if (this.status === "CONVERTED") {
      throw new Error("Lead is already converted");
    }
    this.status = "CONVERTED";
    this.convertedDealId = dealId;
    this.convertedPartyId = partyId;
    this.updatedAt = now;
  }
}
