import { requestLayout } from "../services/request-layout";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { SignValuesSchema, SubmitSignValuesSchema } from "@corely/contracts";
import { UNIT_OF_WORK, type UnitOfWorkPort } from "@corely/kernel";
import { requestRefOf, validateRecipientValues } from "../../domain/ceremony";
import { signingProgress } from "../../domain/signing-lifecycle";
import { hash } from "../../domain/digest";
import { InvitationSecrets } from "../ports/invitation-secrets";
import { CeremonyRepository } from "../ports/ceremony.repository";
import { SignDraftRepository } from "../ports/sign-draft.repository";
import { CeremonyTransitionsService } from "../services/ceremony-transitions.service";
import { RecipientSessionAccessService } from "../services/recipient-session-access.service";
import { signingReviewDigest } from "../../domain/signing-review-digest";

@Injectable()
export class AcceptSignRequestUseCase {
  constructor(
    private readonly transitions: CeremonyTransitionsService,
    private readonly secrets: InvitationSecrets,
    private readonly repo: CeremonyRepository,
    private readonly templates: SignDraftRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
    private readonly sessions: RecipientSessionAccessService
  ) {}

  async execute(session: string, body: unknown) {
    const input = SubmitSignValuesSchema.parse(body);
    if (input.confirmation !== this.secrets.confirmPreview(session, input.review, input.values)) {
      throw new BadRequestException("Review the current answers before signing");
    }
    return this.uow.withinTransaction(async (tx) => {
      if (!/^[a-zA-Z0-9_-]{43}$/.test(session)) {
        throw new ForbiddenException("Signing access unavailable");
      }
      const candidate = await this.repo.byDigest("sessionDigest", hash(session), tx);
      if (!candidate) {
        throw new ForbiddenException("Signing access unavailable");
      }
      const refKey = requestRefOf(candidate);
      await this.repo.lock(refKey, tx);
      const prior = (await this.repo.signers(refKey, tx)).find((row) => row.id === candidate.id);
      if (
        prior?.status === "ACCEPTED" &&
        prior.sessionDigest === hash(session) &&
        prior.sessionUntil &&
        prior.sessionUntil > new Date()
      ) {
        const c = await this.repo.ceremony(refKey, tx);
        if (
          !c ||
          !prior.reviewedSha256 ||
          input.review !== signingReviewDigest(c, prior, prior.reviewedSha256) ||
          hash(JSON.stringify(SignValuesSchema.parse(prior.values))) !==
            hash(JSON.stringify(input.values))
        ) {
          throw new ConflictException("Different acceptance already recorded");
        }
        return;
      }
      const { ref, s, c, draft } = await this.sessions.requireSigner(session, "sessionDigest", tx);
      const layout = await requestLayout(this.templates, ref, draft, tx);
      if (
        !layout ||
        input.review !== signingReviewDigest(c, s, draft.canonicalSha256) ||
        !validateRecipientValues(layout, s.roleId, input.values)
      ) {
        throw new BadRequestException("Review the document and complete your assigned fields");
      }
      await this.repo.updateSigner(
        ref,
        s.id,
        {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          reviewedSha256: draft.canonicalSha256,
          values: input.values,
          envelope: null,
          tokenDigest: null,
        },
        tx
      );
      await this.transitions.recordEvent(ref, s.id, "sign.recipient.accepted.v1", tx, {
        recipientId: s.id,
      });
      const rows = await this.repo.signers(ref, tx);
      const progress = signingProgress(draft.routing, rows);
      if (progress.collected) {
        await this.repo.change(ref, { status: "COLLECTED" }, tx);
        await this.transitions.recordEvent(ref, s.id, "sign.request.collected.v1", tx);
      } else {
        for (const next of progress.toInvite) {
          await this.transitions.invite(ref, next, s.id, tx);
        }
      }
    });
  }
}
