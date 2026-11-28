import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import semver from "semver";

const [baselinePath, planPath, mode] = process.argv.slice(2);
if (!baselinePath || !planPath) {
  throw new Error(
    "Usage: pnpm app:upgrade-preview <baseline.json> <candidate-plan.json> [--verify]"
  );
}

const json = (file) => JSON.parse(readFileSync(resolve(file), "utf8"));
const baseline = json(baselinePath);
const plan = json(planPath);
const packageManifests = plan.packageManifests ?? [
  "packages/booking/package.json",
  "packages/booking-ui/package.json",
];
const runtime = Object.fromEntries(
  [...packageManifests, "packages/contracts/package.json"].map((file) => {
    const { name, version } = json(file);
    return [name, version];
  })
);

const extensions = plan.extensionManifests.map((path) => {
  const { name, version, peerDependencies = {} } = json(path);
  const compatibility = Object.keys(runtime)
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
  ...(plan.productRelease
    ? { productRelease: plan.productRelease }
    : { bookingRelease: plan.bookingRelease }),
  runtime,
  extensions,
  migrations: plan.migrations,
  localPatches: plan.localPatches,
};
const patchesReviewed = !plan.localPatches.some(({ disposition }) => disposition === "review");
const checks = { backend: "pending", browser: "pending" };
function isLocalWebUrl(value) {
  return value && ["localhost", "127.0.0.1"].includes(new URL(value).hostname);
}
function runChecks(commands) {
  for (const [check, args] of Object.entries(commands)) {
    const result = spawnSync("pnpm", args, {
      stdio: ["ignore", 2, 2],
      shell: process.platform === "win32",
    });
    checks[check] = result.status === 0 ? "passed" : "failed";
  }
}

if (mode === "--verify" && compatible && patchesReviewed) {
  if (plan.appId === "invoices") {
    if (!process.env.INVOICE_UPGRADE_STATE || !isLocalWebUrl(process.env.INVOICE_UPGRADE_WEB_URL)) {
      throw new Error("The Invoice fixtures require the provisioned state and a local web URL.");
    }
    runChecks({
      backend: [
        "--dir",
        "services/api",
        "exec",
        "vitest",
        "run",
        "--config",
        "vitest.config.ts",
        "src/modules/invoices/application/use-cases/finalize-invoice/finalize-invoice.usecase.test.ts",
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
        "playwright.invoice-upgrade.config.ts",
      ],
    });
  } else if (plan.packageManifests) {
    throw new Error("Run the application-specific verification in the operator guide.");
  } else {
    verifyBooking(process.env);
  }
}

function verifyBooking(env) {
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
    !isLocalWebUrl(env.OPENBUK_BASE_URL)
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
  runChecks(commands);
}
console.log(JSON.stringify({ baseline, candidate, compatible, checks }, null, 2));
if (!compatible || !patchesReviewed || Object.values(checks).includes("failed")) {
  process.exitCode = 1;
}
