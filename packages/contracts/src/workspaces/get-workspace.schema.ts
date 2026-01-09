import { z } from "zod";
import { WorkspaceDtoSchema } from "./workspace.types";

export const GetWorkspaceOutputSchema = z.object({
  workspace: WorkspaceDtoSchema,
});

export type GetWorkspaceOutput = z.infer<typeof GetWorkspaceOutputSchema>;
