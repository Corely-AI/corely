import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import semver from "semver";

const [baselinePath, planPath, mode] = process.argv.slice(2);
if (!baselinePath || !planPath) {
  throw new Error(
    "Usage: pnpm booking:upgrade-preview <baseline.json> <candidate-plan.json> [--verify]"
  );
}

const json = (file) => JSON.parse(readFileSync(resolve(file), "utf8"));
const baseline = json(baselinePath);
const plan = json(planPath);
const runtime = {
  "@corely/booking": json("packages/booking/package.json").version,
  "@corely/booking-ui": json("packages/booking-ui/package.json").version,
  "@corely/contracts": json("packages/contracts/package.json").version,
};

const extensions = plan.extensionManifests.map((path) => {
  const { name, version, peerDependencies = {} } = json(path);
  const compatibility = ["@corely/booking", "@corely/booking-ui"]
    .filter((dependency) => Object.hasOwn(peerDependencies, dependency))
    .map((dependency) => ({
      dependency,
      required: peerDependencies[dependency],
      candidate: runtime[dependency],
      compatible: semver.satisfies(runtime[dependency], peerDependencies[dependency]),
    }));
  return { name, version, compatibility };
});
const compatible = extensions.every(
  ({ compatibility }) =>
    compatibility.length > 0 && compatibility.every((entry) => entry.compatible)
);
const candidate = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  sourceChanges: execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim(),
  bookingRelease: plan.bookingRelease,
  runtime,
  extensions,
  migrations: plan.migrations,
  localPatches: plan.localPatches,
};
const patchesReviewed = !plan.localPatches.some(({ disposition }) => disposition === "review");
const checks = { backend: "pending", browser: "pending" };
if (mode === "--verify" && compatible && patchesReviewed) {
  const env = process.env;
  if (
    !env.OPENBUK_TEST_DATABASE_URL ||
    !/^postgres(?:ql)?:\/\/[^/]+\/openbuk_test_[a-z0-9_]+(?:\?.*)?$/.test(
      env.OPENBUK_TEST_DATABASE_URL
    ) ||
    ![
      "OPENBUK_BASE_URL",
      "OPENBUK_UPGRADE_ACME_SLUG",
      "OPENBUK_UPGRADE_DEFAULT_SLUG",
      "OPENBUK_UPGRADE_EARLY_DAY",
      "OPENBUK_UPGRADE_ACCEPTED_DAY",
    ].every((key) => env[key]) ||
    !["localhost", "127.0.0.1"].includes(new URL(env.OPENBUK_BASE_URL).hostname)
  ) {
    throw new Error("The backend and browser fixtures require a disposable local installation.");
  }
  const commands = {
    backend: [
      "--dir",
      "services/api",
      "exec",
      "vitest",
      "run",
      "--config",
      "vitest.openbuk.config.ts",
      "--maxWorkers=1",
      "--minWorkers=1",
    ],
    browser: [
      "--dir",
      "apps/e2e",
      "exec",
      "playwright",
      "test",
      "--config",
      "playwright.openbuk.config.ts",
      "booking-upgrade.e2e.spec.ts",
    ],
  };
  for (const [check, args] of Object.entries(commands)) {
    const result = spawnSync("pnpm", args, {
      stdio: ["ignore", 2, 2],
      shell: process.platform === "win32",
    });
    checks[check] = result.status === 0 ? "passed" : "failed";
  }
}
console.log(JSON.stringify({ baseline, candidate, compatible, checks }, null, 2));
if (!compatible || !patchesReviewed || Object.values(checks).includes("failed")) {
  process.exitCode = 1;
}
