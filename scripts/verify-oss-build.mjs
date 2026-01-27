#!/usr/bin/env node
/**
 * CI Script: Verify OSS Build Without EE Packages
 * 
 * This script verifies that the OSS edition can build successfully
 * even when /ee packages are not present.
 * 
 * Steps:
 * 1. Temporarily rename /ee to /ee.backup
 * 2. Run OSS build (without EE packages in workspace)
 * 3. Restore /ee from backup
 * 4. Report success/failure
 */

import { rename, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const EE_PATH = resolve(process.cwd(), "ee");
const BACKUP_PATH = resolve(process.cwd(), "ee.backup");

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("🔍 Verifying OSS build without EE packages...\n");

  const eeExists = await pathExists(EE_PATH);
  const backupExists = await pathExists(BACKUP_PATH);

  if (backupExists) {
    throw new Error(
      "ee.backup directory already exists. Please remove it before running this script."
    );
  }

  if (!eeExists) {
    console.log("⚠️  /ee directory not found. Skipping verification (OSS-only repo).");
    return;
  }

  try {
    // Step 1: Temporarily remove EE from workspace
    console.log("📦 Step 1: Temporarily moving /ee to /ee.backup...");
    await rename(EE_PATH, BACKUP_PATH);
    console.log("✅ Moved /ee to /ee.backup\n");

    // Step 2: Clean install (to remove EE package symlinks)
    console.log("📦 Step 2: Cleaning pnpm cache and reinstalling...");
    execSync("pnpm install --force", { stdio: "inherit" });
    console.log("✅ Clean install complete\n");

    // Step 3: Build OSS
    console.log("🔨 Step 3: Building OSS edition...");
    execSync("pnpm run build:oss", { stdio: "inherit", env: { ...process.env, EDITION: "oss", VITE_EDITION: "oss" } });
    console.log("✅ OSS build successful\n");

    // Step 4: Run OSS tests
    console.log("🧪 Step 4: Running OSS tests...");
    execSync("pnpm run test:unit", { stdio: "inherit", env: { ...process.env, EDITION: "oss" } });
    console.log("✅ OSS tests passed\n");

    console.log("🎉 SUCCESS: OSS edition builds and tests pass without EE packages!");
  } catch (error) {
    console.error("\n❌ FAILURE: OSS build failed without EE packages");
    console.error(error.message);
    throw error;
  } finally {
    // Always restore /ee
    console.log("\n📦 Restoring /ee from backup...");
    const backupStillExists = await pathExists(BACKUP_PATH);
    if (backupStillExists) {
      await rename(BACKUP_PATH, EE_PATH);
      console.log("✅ Restored /ee from backup");
      
      // Reinstall to restore EE symlinks
      console.log("📦 Reinstalling to restore EE packages...");
      execSync("pnpm install", { stdio: "inherit" });
      console.log("✅ Workspace restored");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
