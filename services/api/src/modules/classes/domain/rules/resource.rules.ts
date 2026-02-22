import { ValidationFailedError } from "@corely/domain";
import type { ClassGroupResourceEntity } from "../entities/classes.entities";

export const validateResourcePayload = (resource: {
  type: ClassGroupResourceEntity["type"];
  documentId?: string | null;
  url?: string | null;
}) => {
  const hasDocument = Boolean(resource.documentId && resource.documentId.trim().length > 0);
  const hasUrl = Boolean(resource.url && resource.url.trim().length > 0);

  if (resource.type === "DOC" && !hasDocument) {
    throw new ValidationFailedError("Document resource requires documentId", [
      { message: "documentId is required for DOC resources", members: ["documentId"] },
    ]);
  }

  if (resource.type === "LINK" && !hasUrl) {
    throw new ValidationFailedError("Link resource requires url", [
      { message: "url is required for LINK resources", members: ["url"] },
    ]);
  }

  if (resource.type === "RECORDING" && !hasDocument && !hasUrl) {
    throw new ValidationFailedError("Recording resource requires documentId or url", [
      {
        message: "Provide documentId or url for RECORDING resources",
        members: ["documentId", "url"],
      },
    ]);
  }
};
