import { Inject, Injectable } from "@nestjs/common";
import {
  OPENBUK_REPOSITORY,
  type OpenBukRepositoryPort,
  type StudioScope,
} from "../ports/openbuk-repository.port";

@Injectable()
export class OpenBukTimezone {
  constructor(@Inject(OPENBUK_REPOSITORY) private readonly studios: OpenBukRepositoryPort) {}

  async forWorkspace(scope: StudioScope): Promise<string | undefined> {
    return (
      (await this.studios.studio(scope))?.timezone ?? (await this.studios.draft(scope))?.timezone
    );
  }
}
