import { ConflictError } from "@corely/kernel";

export const assertCanArchiveItem = (activeVariantCount: number): void => {
  if (activeVariantCount > 0) {
    throw new ConflictError("Cannot archive item with active variants");
  }
};
