import { SaveSignDraftSchema } from "@corely/contracts";
import { Injectable } from "@nestjs/common";
import type { UseCaseContext } from "@corely/kernel";
import {
  templateRevisionCommand,
  TemplateRevisionWriter,
} from "../services/template-revision-writer.service";

@Injectable()
export class SaveSignTemplateUseCase {
  constructor(private readonly revisions: TemplateRevisionWriter) {}

  async execute(ctx: UseCaseContext, id: string, command: string | undefined, body: unknown) {
    const identity = templateRevisionCommand(id, command);
    const input = SaveSignDraftSchema.parse(body);
    return this.revisions.write(ctx, identity, { kind: "save", draft: input });
  }
}
