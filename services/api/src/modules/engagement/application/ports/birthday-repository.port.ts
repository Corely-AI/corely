export type BirthdayCustomerRecord = {
  customerPartyId: string;
  displayName: string;
  birthday: Date;
};

export const BIRTHDAY_REPOSITORY_PORT = "engagement/birthday-repository";

export interface BirthdayRepositoryPort {
  listCustomerBirthdays(tenantId: string): Promise<BirthdayCustomerRecord[]>;
}
