import { parseEnv } from "node:util";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import type { FocusedSurfaceKey } from "../../packages/config/src/focused-surfaces";
import type * as FocusedConfig from "../../packages/config/src/focused-surfaces";
import type * as Vite from "vite";
import { createFocusedGateway } from "./gateway";
const { parseFocusedDevEnv, focusedSurfaceKeys, focusedSurfacePorts } = createRequire(
  import.meta.url
)("../../packages/config/src/focused-surfaces.ts") as typeof FocusedConfig;

const root = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const command = args[0] ?? "check";
const envFile = resolve(root, process.env.CORELY_DEV_ENV_FILE ?? ".env.focused.local");
if (command === "init") {
  const example = readFileSync(resolve(root, ".env.focused.example"), "utf8");
  mkdirSync(dirname(envFile), { recursive: true });
  writeFileSync(
    envFile,
    example
      .replace("REPLACE_SSO_ENCRYPTION_KEY", randomBytes(32).toString("hex"))
      .replace("REPLACE_PRIVATE_PROXY_KEY", randomBytes(32).toString("hex")),
    { flag: "wx", mode: 0o600 }
  );
  process.stdout.write(
    "Created private local configuration. Generate/trust the certificate as documented.\n"
  );
} else {
  if (!["check", "dev", "build", "api"].includes(command)) {
    throw new Error("Expected init, check, dev, build or api");
  }
  const env = { ...parseEnv(readFileSync(envFile, "utf8")), ...process.env };
  const config = parseFocusedDevEnv(env);
  if (command === "check") {
    process.stdout.write(
      JSON.stringify(
        {
          origins: config.origins,
          callbacks: config.callbacks,
          apiOrigin: config.server.CORELY_DEV_API_ORIGIN,
        },
        null,
        2
      ) + "\n"
    );
  } else if (command === "api") {
    const child = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["dev:api"], {
      cwd: root,
      env: { ...process.env, ...config.apiEnv },
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("exit", (code) => {
      process.exitCode = code ?? 1;
    });
  } else {
    const requested = args.find((arg) => arg.startsWith("--surface="))?.split("=")[1];
    if (requested && !(focusedSurfaceKeys as readonly string[]).includes(requested)) {
      throw new Error("Unknown --surface; use login, app-center, invoice or hr");
    }
    const selected: FocusedSurfaceKey[] = requested
      ? [...new Set<FocusedSurfaceKey>(["login", requested as FocusedSurfaceKey])]
      : [...focusedSurfaceKeys];
    const probes = args.includes("--probe");
    const apps = { login: "login", "app-center": "app-center", invoice: "invoice", hr: "hr" };
    const vitePackage = createRequire(resolve(root, "apps/login/package.json")).resolve(
      "vite/package.json"
    );
    const viteEntry = resolve(dirname(vitePackage), "dist/node/index.js");
    const vite = (await import(pathToFileURL(viteEntry).href)) as typeof Vite;
    const servers: Array<{ close: () => Promise<void> }> = [];
    try {
      for (const surface of selected) {
        if (probes && surface !== "login") {
          continue;
        }
        const directory = resolve(root, "apps", apps[surface]);
        if (!existsSync(resolve(directory, "package.json"))) {
          throw new Error(
            `apps/${apps[surface]} is not implemented yet. Use --probe to check origins, or --surface=login. Product clients belong to #392/#394/#397.`
          );
        }
        const publicEnv = Object.fromEntries(
          Object.entries(config.browser).map(([key, value]) => [
            `import.meta.env.${key}`,
            JSON.stringify(value),
          ])
        );
        if (command === "build") {
          await vite.build({
            root: directory,
            configFile: resolve(directory, "vite.config.ts"),
            define: publicEnv,
            envPrefix: [],
          });
        } else {
          const server = await vite.createServer({
            root: directory,
            configFile: resolve(directory, "vite.config.ts"),
            define: publicEnv,
            envPrefix: [],
            server: {
              host: "127.0.0.1",
              port: focusedSurfacePorts[surface],
              strictPort: true,
              hmr: false,
              allowedHosts: [new URL(config.origins[surface]).hostname],
            },
          });
          await server.listen();
          servers.push(server);
        }
      }
      if (command === "dev") {
        const gateway = createFocusedGateway(config, new Set(selected), probes);
        const port = Number(new URL(config.origins.login).port || 443);
        await new Promise<void>((accept, reject) => {
          gateway.once("error", reject);
          gateway.listen(port, "127.0.0.1", accept);
        });
        process.stdout.write(
          `Local HTTPS gateway ready. ${probes ? "Non-login hosts use transport probes." : ""}\n`
        );
        for (const surface of selected) {
          process.stdout.write(`${surface}: ${config.origins[surface]}\n`);
        }
        const close = async () => {
          gateway.closeAllConnections();
          await new Promise<void>((done) => gateway.close(() => done()));
          await Promise.all(servers.map((server) => server.close()));
        };
        process.once("SIGINT", () => {
          void close();
        });
        process.once("SIGTERM", () => {
          void close();
        });
      }
    } catch (error) {
      await Promise.all(servers.map((server) => server.close()));
      throw error;
    }
  }
}
