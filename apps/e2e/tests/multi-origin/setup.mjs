import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn, spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const require = createRequire(path.join(root, "package.json"));
const fromVitest = createRequire(require.resolve("vitest/package.json"));
export default async function setup() {
  const database = process.env.SSO_TEST_DATABASE_URL;
  if (!database) {
    throw new Error(
      "Set the disposable local SSO_TEST_DATABASE_URL before running multi-origin tests"
    );
  }
  const target = new URL(database);
  if (target.hostname !== "127.0.0.1" || !/^\/corely_384_[a-z0-9_]+$/.test(target.pathname)) {
    throw new Error("Refusing non-disposable SSO database");
  }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "corely-401-"));
  const removeDirectory = () => {
    const actual = fs.realpathSync(directory);
    const relative = path.relative(fs.realpathSync(os.tmpdir()), actual);
    if (
      !relative ||
      relative.startsWith("..") ||
      path.isAbsolute(relative) ||
      !path.basename(actual).startsWith("corely-401-")
    ) {
      throw new Error("Refusing unsafe fixture cleanup");
    }
    fs.rmSync(actual, { recursive: true, force: true });
  };
  process.env.SSO_TEST_OUTPUT_DIR = directory;
  process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";
  const openssl =
    process.env.CORELY_TEST_OPENSSL ??
    (process.platform === "win32"
      ? path.join(
          process.env.ProgramFiles ?? "C:\\Program Files",
          "Git",
          "usr",
          "bin",
          "openssl.exe"
        )
      : "openssl");
  const certificate = spawnSync(
    openssl,
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "1",
      "-subj",
      "/CN=corely-local-test",
      "-addext",
      "subjectAltName=DNS:login.corely.test,DNS:app.corely.test,DNS:invoice.app.corely.test,DNS:hr.app.corely.test",
      "-keyout",
      path.join(directory, "key.pem"),
      "-out",
      path.join(directory, "cert.pem"),
    ],
    { stdio: "ignore", timeout: 15000 }
  );
  if (certificate.status !== 0) {
    removeDirectory();
    throw new Error(
      "Disposable certificate generation failed; set CORELY_TEST_OPENSSL to an installed OpenSSL executable"
    );
  }
  let child;
  const close = async () => {
    if (child && child.exitCode === null) {
      await new Promise((done) => {
        const timeout = setTimeout(() => {
          child.kill();
          done();
        }, 15000);
        child.once("exit", () => {
          clearTimeout(timeout);
          done();
        });
        if (child.connected) {
          child.send({ type: "close" });
        } else {
          child.kill();
        }
      });
    }
    removeDirectory();
  };
  try {
    const vitePackage = fromVitest.resolve("vite/package.json");
    const viteManifest = JSON.parse(fs.readFileSync(vitePackage, "utf8"));
    const viteEntry = path.resolve(
      path.dirname(vitePackage),
      viteManifest.exports["."].import.default
    );
    const { build } = await import(pathToFileURL(viteEntry).href);
    const previousOrigin = process.env.VITE_CORELY_APP_CENTER_ORIGIN;
    process.env.VITE_CORELY_APP_CENTER_ORIGIN = "https://app.corely.test:8444";
    try {
      for (const surface of ["login", "app-center", "invoice"]) {
        await build({
          root: path.join(root, "apps", surface),
          configFile: path.join(root, "apps", surface, "vite.config.ts"),
          logLevel: "warn",
          build: { outDir: path.join(directory, surface), emptyOutDir: true },
        });
      }
    } finally {
      if (previousOrigin === undefined) {
        delete process.env.VITE_CORELY_APP_CENTER_ORIGIN;
      } else {
        process.env.VITE_CORELY_APP_CENTER_ORIGIN = previousOrigin;
      }
    }
    const viteNodePackage = fromVitest.resolve("vite-node/package.json");
    const viteNodeManifest = JSON.parse(fs.readFileSync(viteNodePackage, "utf8"));
    const viteNode = path.resolve(path.dirname(viteNodePackage), viteNodeManifest.bin["vite-node"]);
    child = spawn(
      process.execPath,
      [
        viteNode,
        "--config",
        path.join(root, "services/api/vitest.config.ts"),
        path.join(root, "services/api/src/modules/identity/testkit/multi-origin-server.ts"),
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          NODE_ENV: "test",
          OUTBOX_DISPATCH_DRIVER: "disabled",
          SSO_TEST_DATABASE_URL: database,
          SSO_TEST_OUTPUT_DIR: directory,
        },
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      }
    );
    await new Promise((ready, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Local multi-origin fixture did not become ready")),
        60000
      );
      child.once("error", () => {
        clearTimeout(timeout);
        reject(new Error("Could not start the local fixture process"));
      });
      child.once("exit", (code) => {
        clearTimeout(timeout);
        reject(new Error(`Local fixture exited during startup (${code})`));
      });
      child.on("message", (message) => {
        if (message?.type === "ready") {
          clearTimeout(timeout);
          ready();
        }
      });
    });
    return close;
  } catch (error) {
    await close();
    throw error;
  }
}
