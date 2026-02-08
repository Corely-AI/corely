import { type PartyLifecycleStatus } from "../../domain/party.aggregate";

export interface PartyLifecycleTransitionDTO {
  id: string;
  fromStatus: PartyLifecycleStatus | null;
  toStatus: PartyLifecycleStatus;
  reason: string | null;
  changedByUserId: string | null;
  changedAt: Date;
}

export interface PartyQueryPort {
  getLifecycleHistory(tenantId: string, partyId: string): Promise<PartyLifecycleTransitionDTO[]>;
}

export const PARTY_QUERY_PORT = "party/party-query";
