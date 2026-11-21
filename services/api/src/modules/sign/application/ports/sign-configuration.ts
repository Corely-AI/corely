export abstract class SignConfiguration {
  abstract describe(): Promise<{
    publicOrigin: string | null;
    invitationKeyConfigured: boolean;
    certificateExpiresAt: string | null;
    signerPinned: boolean;
    privateKeyReadable: boolean;
    trustFileReadable: boolean;
  }>;
}
