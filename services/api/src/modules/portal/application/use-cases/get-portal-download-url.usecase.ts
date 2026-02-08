import {
  BaseUseCase,
  ok,
  err,
  ForbiddenError,
  type UseCaseContext,
  type Result,
  type UseCaseError,
  type LoggerPort,
  isErr,
} from "@corely/kernel";
import { type GetDownloadUrlUseCase } from "../../../documents/application/use-cases/get-download-url/get-download-url.usecase";
import { type GetStudentMaterialsUseCase } from "./get-student-materials.usecase";

type Deps = {
  logger: LoggerPort;
  getDownloadUrl: GetDownloadUrlUseCase;
  getStudentMaterials: GetStudentMaterialsUseCase;
};

export class GetPortalDownloadUrlUseCase extends BaseUseCase<
  { studentId: string; documentId: string },
  any
> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected async handle(
    input: { studentId: string; documentId: string },
    ctx: UseCaseContext
  ): Promise<Result<any, UseCaseError>> {
    const materials = await this.useCaseDeps.getStudentMaterials.execute(
      { studentId: input.studentId },
      ctx
    );
    if (isErr(materials)) {
      return err(materials.error);
    }

    const isVisible = materials.value.items.some((d: any) => d.id === input.documentId);
    if (!isVisible) {
      return err(new ForbiddenError("Access denied to this document"));
    }

    return this.useCaseDeps.getDownloadUrl.execute({ documentId: input.documentId }, ctx);
  }
}
