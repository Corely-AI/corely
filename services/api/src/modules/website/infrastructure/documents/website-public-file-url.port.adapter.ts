import { unwrap } from "@corely/kernel";
import type { WebsitePublicFileUrlPort } from "../../application/ports/public-file-url.port";
import type { DocumentsApplication } from "../../../documents/application/documents.application";

export class WebsitePublicFileUrlPortAdapter implements WebsitePublicFileUrlPort {
  constructor(private readonly documents: DocumentsApplication) {}

  async getPublicUrl(fileId: string): Promise<string | null> {
    try {
      const result = await this.documents.getPublicFileUrl.execute({ fileId }, {});
      return unwrap(result).url;
    } catch {
      return null;
    }
  }
}
