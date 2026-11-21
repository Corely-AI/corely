export abstract class InvitationSecrets {
  abstract confirmPreview(session: string, review: string, values: unknown): string;
  abstract secret(): string;
  abstract sealInvitation(token: string, id: string): string;
  abstract openInvitation(value: string, id: string): string;
  abstract publicOrigin(): string;
}
