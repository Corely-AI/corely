import type { SsoAppKey } from "@corely/contracts";

export interface SsoFamily {
  id: string;
  environment: string;
  userId: string;
  handleHash: string;
  credentialHash: string;
  createdAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}
export interface SsoTransaction {
  id: string;
  environment: string;
  appKey: SsoAppKey;
  origin: string;
  returnPath: string;
  browserHash: string;
  stateHash: string;
  stateCipher: string;
  verifierCipher: string;
  challenge: string;
  expiresAt: Date;
  codeHash: string | null;
  codeExpiresAt: Date | null;
  familyId: string | null;
  consumedAt: Date | null;
}
export interface SsoAppSession {
  id: string;
  familyId: string;
  environment: string;
  appKey: SsoAppKey;
  userId: string;
  handleHash: string;
  expiresAt: Date;
  idleExpiresAt: Date;
  revokedAt: Date | null;
}
export interface SsoEmailChallenge {
  id: string;
  transactionId: string;
  email: string;
  userId: string | null;
  credentialHash: string | null;
  codeHash: string;
  codeCipher: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
}
export interface SsoStorePort {
  /** Validate current family/account/access and atomically touch or rotate one host session. */
  useSession(input: {
    handleHash: string;
    environment: string;
    appKey: string;
    now: Date;
    /** Omit for non-renewing revocation/expiry inspection. */
    idleExpiresAt?: Date;
    replacementHash?: string;
  }): Promise<SsoAppSession>;
  /** Revoke the presented host session's central family and all children atomically.
   * Expired/revoked sessions can still sign out; a rotated handle cannot revoke a newer session.
   */
  revokeFamily(input: {
    handleHash: string;
    environment: string;
    appKey: string;
    now: Date;
  }): Promise<void>;
  prepareEmailChallenge(challenge: SsoEmailChallenge): Promise<void>;
  findEmailChallenge(id: string): Promise<SsoEmailChallenge | null>;
  markEmailDelivered(id: string): Promise<void>;
  createTransaction(transaction: SsoTransaction): Promise<void>;
  getTransaction(id: string): Promise<SsoTransaction | null>;
  findFamily(handleHash: string, environment: string): Promise<SsoFamily | null>;
  /** Durable fixed-window budgets; failed attempts count across replicas. */
  takeAttempt(key: string, now: Date, limit: number): Promise<boolean>;
  /** Atomically bind a pending request to a live family, with audit/outbox. */
  authorize(input: {
    transactionId: string;
    family: SsoFamily;
    createFamily: boolean;
    codeHash: string;
    codeExpiresAt: Date;
    now: Date;
    emailProof?: { codeHash: string; email: string };
  }): Promise<boolean>;
  /** Atomic code/transaction consumption + live-family/access check + app session. */
  redeem(input: {
    transaction: SsoTransaction;
    codeHash: string;
    browserHash: string;
    stateHash: string;
    challenge: string;
    session: Omit<SsoAppSession, "userId">;
    now: Date;
  }): Promise<void>;
  cancel(transactionId: string, browserHash: string): Promise<void>;
}
export const SSO_STORE = "identity/sso-store";
