import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export type TaxMode = "FREELANCER" | "COMPANY";

export function useTaxMode() {
  const { activeWorkspace } = useWorkspace();
  const mode: TaxMode = activeWorkspace?.kind === "COMPANY" ? "COMPANY" : "FREELANCER";

  return {
    mode,
    isFreelancer: mode === "FREELANCER",
    isCompany: mode === "COMPANY",
  };
}
