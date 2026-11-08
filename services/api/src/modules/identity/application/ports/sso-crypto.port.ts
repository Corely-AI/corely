export interface SsoCryptoPort {
  secret(): string;
  emailCode(): string;
  hash(value: string): string;
  challenge(value: string): string;
  equal(left: string, right: string): boolean;
  csrf(handle: string, binding: string): string;
  encrypt(value: string, binding: string): string;
  decrypt(value: string, binding: string): string;
}
export const SSO_CRYPTO = "identity/sso-crypto";
