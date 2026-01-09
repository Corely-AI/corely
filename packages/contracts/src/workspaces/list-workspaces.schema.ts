import { z } from "zod";
import { WorkspaceDtoSchema } from "./workspace.types";

export const ListWorkspacesOutputSchema = z.object({
  workspaces: z.array(WorkspaceDtoSchema),
});

export type ListWorkspacesOutput = z.infer<typeof ListWorkspacesOutputSchema>;
