import bcrypt from "bcrypt";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  ConflictError,
  err,
  ok,
  type ClockPort,
  type IdGeneratorPort,
} from "@corely/kernel";
import { type CmsReaderSignUpInput, type CmsReaderAuthOutput } from "@corely/contracts";
import { CmsReaderEntity } from "../../domain/cms-reader.entity";
import { type CmsReaderRepositoryPort } from "../ports/cms-reader-repository.port";
import { type CmsReaderTokenService } from "../../infrastructure/security/cms-reader-token.service";
import { toCmsReaderDto } from "../mappers/cms.mapper";
import { assertPublicModuleEnabled } from "../../../../shared/public";

type Deps = {
  logger: LoggerPort;
  readerRepo: CmsReaderRepositoryPort;
  tokenService: CmsReaderTokenService;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

export class SignUpCmsReaderUseCase extends BaseUseCase<CmsReaderSignUpInput, CmsReaderAuthOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CmsReaderSignUpInput): CmsReaderSignUpInput {
    if (!input.email?.includes("@")) {
      throw new ValidationError("Invalid email");
    }
    if (!input.password || input.password.length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }
    return input;
  }

  protected async handle(
    input: CmsReaderSignUpInput,
    ctx: UseCaseContext
  ): Promise<Result<CmsReaderAuthOutput, UseCaseError>> {
    const publishError = assertPublicModuleEnabled(ctx, "cms");
    if (publishError) {
      return err(publishError);
    }

    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.useCaseDeps.readerRepo.findByEmail(ctx.tenantId, email);
    if (existing) {
      return err(new ConflictError("Reader with this email already exists"));
    }

    const now = this.useCaseDeps.clock.now();
    const passwordHash = await bcrypt.hash(input.password, 10);
    const reader = CmsReaderEntity.create({
      id: this.useCaseDeps.idGenerator.newId(),
      tenantId: ctx.tenantId,
      workspaceId: ctx.workspaceId,
      email,
      passwordHash,
      displayName: input.displayName?.trim() ?? null,
      createdAt: now,
    });

    await this.useCaseDeps.readerRepo.create(reader);

    const accessToken = this.useCaseDeps.tokenService.generateAccessToken({
      readerId: reader.id,
      tenantId: reader.tenantId,
      workspaceId: reader.workspaceId,
      email: reader.email,
      displayName: reader.displayName ?? null,
    });

    return ok({
      reader: toCmsReaderDto(reader),
      accessToken,
    });
  }
}
