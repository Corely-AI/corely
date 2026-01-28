import bcrypt from "bcrypt";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  UnauthorizedError,
  err,
  ok,
} from "@corely/kernel";
import { type CmsReaderLoginInput, type CmsReaderAuthOutput } from "@corely/contracts";
import { type CmsReaderRepositoryPort } from "../ports/cms-reader-repository.port";
import { type CmsReaderTokenService } from "../../infrastructure/security/cms-reader-token.service";
import { toCmsReaderDto } from "../mappers/cms.mapper";

type Deps = {
  logger: LoggerPort;
  readerRepo: CmsReaderRepositoryPort;
  tokenService: CmsReaderTokenService;
};

export class SignInCmsReaderUseCase extends BaseUseCase<CmsReaderLoginInput, CmsReaderAuthOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: CmsReaderLoginInput): CmsReaderLoginInput {
    if (!input.email?.includes("@")) {
      throw new ValidationError("Invalid email");
    }
    if (!input.password) {
      throw new ValidationError("Password is required");
    }
    return input;
  }

  protected async handle(
    input: CmsReaderLoginInput,
    ctx: UseCaseContext
  ): Promise<Result<CmsReaderAuthOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.workspaceId) {
      return err(new ValidationError("tenantId or workspaceId missing from context"));
    }

    const email = input.email.trim().toLowerCase();
    const reader = await this.useCaseDeps.readerRepo.findByEmail(ctx.tenantId, email);
    if (!reader) {
      return err(new UnauthorizedError("Invalid credentials"));
    }
    if (reader.workspaceId !== ctx.workspaceId) {
      return err(new UnauthorizedError("Invalid credentials"));
    }

    const matches = await bcrypt.compare(input.password, reader.passwordHash);
    if (!matches) {
      return err(new UnauthorizedError("Invalid credentials"));
    }

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
