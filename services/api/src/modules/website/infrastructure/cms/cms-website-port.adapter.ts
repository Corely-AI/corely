import { unwrap } from "@corely/kernel";
import type { CmsReadPort } from "../../application/ports/cms-read.port";
import type { CmsWritePort } from "../../application/ports/cms-write.port";
import { type CmsApplication } from "../../../cms/application/cms.application";

export class CmsWebsitePortAdapter implements CmsReadPort, CmsWritePort {
  constructor(private readonly cms: CmsApplication) {}

  async getEntryForWebsiteRender(params: {
    tenantId: string;
    entryId: string;
    locale?: string;
    mode: "live" | "preview";
  }) {
    const result = await this.cms.getEntryForWebsiteRender.execute(
      { entryId: params.entryId, mode: params.mode },
      { tenantId: params.tenantId }
    );
    return unwrap(result);
  }

  async createDraftEntryFromBlueprint(params: {
    tenantId: string;
    workspaceId?: string | null;
    authorUserId?: string | null;
    locale: string;
    blueprint: {
      title: string;
      excerpt: string;
      contentJson: unknown;
      suggestedPath?: string | null;
    };
  }): Promise<{ entryId: string }> {
    const result = await this.cms.createEntryFromBlueprint.execute(
      {
        title: params.blueprint.title,
        excerpt: params.blueprint.excerpt,
        contentJson: params.blueprint.contentJson,
        slug: undefined,
      },
      {
        tenantId: params.tenantId,
        workspaceId: params.workspaceId ?? null,
        userId: params.authorUserId ?? undefined,
      }
    );

    return unwrap(result);
  }
}
