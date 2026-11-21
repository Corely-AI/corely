import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AppRegistry } from "../../services/api/src/modules/platform/infrastructure/registries/app-registry";

const root = fileURLToPath(new URL("../../", import.meta.url));

// Package ownership is explicit. Some app IDs also name unrelated shared packages.
const appPackageDirectories: Readonly<Record<string, readonly string[]>> = {
  booking: ["booking", "booking-ui"],
  invoices: ["invoices", "invoices-ui"],
  parties: ["customers", "customers-ui"],
  expenses: ["expenses", "expenses-ui"],
  crm: ["crm", "crm-ui"],
  people: ["people", "people-ui"],
  tasks: ["tasks", "tasks-ui"],
  sales: ["sales", "sales-ui"],
};

function readPackage(directory: string) {
  const path = directory + "/package.json";
  const manifest: unknown = JSON.parse(readFileSync(resolve(root, path), "utf8"));
  if (
    !manifest ||
    typeof manifest !== "object" ||
    !("name" in manifest) ||
    typeof manifest.name !== "string" ||
    !("version" in manifest) ||
    typeof manifest.version !== "string"
  ) {
    throw new Error("Expected package name and version in " + path);
  }
  return { name: manifest.name, version: manifest.version, manifest: path };
}

export function getAppReleaseInventory() {
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const registry = new AppRegistry();
  registry.loadManifests();
  const clients = readdirSync(resolve(root, "apps"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "e2e")
    .map((entry) => "apps/" + entry.name)
    .filter((directory) => existsSync(resolve(root, directory, "package.json")))
    .sort()
    .map(readPackage);

  return {
    sourceRevision: git(["rev-parse", "HEAD"]),
    hasLocalChanges: git(["status", "--porcelain"]) !== "",
    builds: {
      api: readPackage("services/api"),
      contracts: readPackage("packages/contracts"),
      clients,
    },
    apps: registry
      .list()
      .sort((a, b) => a.appId.localeCompare(b.appId, "en"))
      .map(({ appId, version, dependencies, allowedSurfaces }) => ({
        appId,
        version,
        dependencies,
        allowedSurfaces,
        packages: (appPackageDirectories[appId] ?? [])
          .map((name) => "packages/" + name)
          .filter((directory) => existsSync(resolve(root, directory, "package.json")))
          .map(readPackage),
      })),
  };
}
