import type { SignRectangle } from "@corely/contracts";

type CropBox = { x: number; y: number; width: number; height: number };

import { createRequire } from "node:module";
export const toPdfRectangle: (rect: SignRectangle, crop: CropBox, degrees: number) => CropBox =
  createRequire(import.meta.url)("#sign-page-geometry").toPdfRectangle;
