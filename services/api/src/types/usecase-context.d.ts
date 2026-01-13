import "@corely/kernel";

declare module "@corely/kernel" {
  interface UseCaseContext {
    workspaceId?: string | null;
  }
}
