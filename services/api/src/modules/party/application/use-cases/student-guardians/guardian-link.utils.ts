export const STUDENT_GUARDIAN_MODULE_ID = "party";
export const STUDENT_GUARDIAN_LINK_TYPE = "guardian_of";
export const PARTY_ENTITY_TYPE = "Party";

export type GuardianLinkMetadata = {
  isPrimaryPayer?: boolean;
  isPrimaryContact?: boolean;
};

export const parseGuardianMetadata = (metadata: unknown): GuardianLinkMetadata => {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const record = metadata as Record<string, unknown>;
  return {
    isPrimaryPayer: Boolean(record.isPrimaryPayer),
    isPrimaryContact: Boolean(record.isPrimaryContact),
  };
};

export const mergeGuardianMetadata = (
  current: GuardianLinkMetadata,
  updates: GuardianLinkMetadata
): GuardianLinkMetadata => ({
  isPrimaryPayer:
    typeof updates.isPrimaryPayer === "boolean" ? updates.isPrimaryPayer : current.isPrimaryPayer,
  isPrimaryContact:
    typeof updates.isPrimaryContact === "boolean"
      ? updates.isPrimaryContact
      : current.isPrimaryContact,
});
