/**
 * EE Bridge Loader for Frontend (apps/web)
 *
 * This is the ONLY file allowed to import from @corely/web-ee.
 * All EE UI components must be loaded through this bridge.
 *
 * CRITICAL: This file uses dynamic imports to ensure OSS can build without EE packages.
 */

import type { ComponentType } from "react";

export interface WorkspaceSwitcherProps {
  workspaces: any[];
  activeWorkspaceId: string | null;
  onWorkspaceChange: (workspaceId: string) => void;
  onCreateWorkspace?: () => void;
  collapsed?: boolean;
  isLoading?: boolean;
  ui: any;
}

/**
 * Load EE WorkspaceSwitcher component
 *
 * @throws Error if EE package is not available (VITE_EDITION !== "ee" or package not installed)
 */
export async function loadWorkspaceSwitcher(): Promise<ComponentType<WorkspaceSwitcherProps>> {
  try {
    // Dynamic import ensures this only fails at runtime, not build time
    const mod = await import("@corely/web-ee");
    return mod.WorkspaceSwitcher;
  } catch (error) {
    throw new Error(
      `Failed to load @corely/web-ee. Ensure EE packages are installed and VITE_EDITION=ee is set. ${(error as Error).message}`
    );
  }
}

/**
 * Check if EE packages are available
 * Useful for graceful degradation
 */
export async function isEeAvailable(): Promise<boolean> {
  try {
    await import("@corely/web-ee");
    return true;
  } catch {
    return false;
  }
}

/**
 * Load all EE web components
 * Returns an object with all EE exports
 */
export async function loadEeWeb() {
  try {
    const mod = await import("@corely/web-ee");
    return mod;
  } catch (error) {
    throw new Error(`Failed to load @corely/web-ee. ${(error as Error).message}`);
  }
}
