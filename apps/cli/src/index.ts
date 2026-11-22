#!/usr/bin/env node
import { parseArgs, stripVTControlCharacters } from "node:util";
import { HttpError, request } from "@corely/api-client";
import {
  CliSsoAccountSchema,
  CliSsoSessionSchema,
  SsoHandleSchema,
  SsoRedirectSchema,
} from "@corely/contracts/identity/sso";
import metadata from "../package.json";
import { runAgentCommand } from "./agent-commands";
import { authorizeInBrowser } from "./browser-login";
import { CliError } from "./errors";

const help = `Corely CLI

Commands
  corely auth login
  corely auth logout [--json]
  corely workspaces list [--json]
  corely whoami [--workspace <id-or-slug>] [--json]

Agent access
  corely agent prepare --tenant <id> --workspace <id>
  corely grants create --tenant <id> --workspace <id> --agent <id> --name <name>
    --fingerprint <hash> --operation <operation-id> [--minutes <1-60>]
  corely grants list --tenant <id> --workspace <id>
  corely grants revoke --tenant <id> --workspace <id> --agent <id>
  corely capabilities list --tenant <id> --workspace <id> --agent <id>
  corely capabilities describe <operation-id> --tenant <id> --workspace <id> --agent <id>
  corely operations run <operation-id> --tenant <id> --workspace <id> --agent <id>

Set CORELY_URL to the HTTPS origin of your Corely sign-in page.
Use --help for usage and --version for the installed version.`;

type Account = ReturnType<typeof CliSsoAccountSchema.parse>;

function getOrigin(): string {
  try {
    const value = process.env.CORELY_URL ?? "";
    const url = new URL(value);
    if (url.protocol === "https:" && (value === url.origin || value === `${url.origin}/`)) {
      return url.origin;
    }
  } catch {
    // Report the same configuration error for absent and malformed origins.
  }
  throw new CliError("CONFIG_REQUIRED", "Set CORELY_URL to your Corely HTTPS sign-in origin.");
}

function api(
  origin: string,
  path: string,
  options: Omit<Parameters<typeof request>[0], "url"> = {}
) {
  return request({
    ...options,
    url: `${origin}/sso/cli/${path}`,
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
}

async function credentialEntry(account: string, service = "Corely CLI") {
  try {
    const { Entry } = await import("@napi-rs/keyring");
    const entry = new Entry(service, account);
    return {
      get() {
        try {
          const parsed = SsoHandleSchema.safeParse(entry.getPassword());
          return parsed.success ? parsed.data : null;
        } catch {
          throw new CliError(
            "CREDENTIAL_STORE_UNAVAILABLE",
            "Could not read the OS credential store."
          );
        }
      },
      save(token: string) {
        try {
          entry.setPassword(token);
        } catch {
          throw new CliError(
            "CREDENTIAL_STORE_UNAVAILABLE",
            "Could not save to the OS credential store."
          );
        }
      },
      remove() {
        try {
          entry.deleteCredential();
        } catch {
          throw new CliError(
            "CREDENTIAL_STORE_UNAVAILABLE",
            "Could not clear the OS credential store."
          );
        }
      },
    };
  } catch {
    throw new CliError(
      "CREDENTIAL_STORE_UNAVAILABLE",
      "Unlock your OS credential store and try again."
    );
  }
}

function terminalLabel(value: string): string {
  return stripVTControlCharacters(value).replace(/\s+/g, " ").trim();
}

function selectWorkspace(workspaces: Account["workspaces"], target?: string) {
  if (target) {
    const matches = workspaces.filter(
      (workspace) => workspace.id === target || workspace.slug === target
    );
    if (matches.length === 1) {
      return matches[0];
    }
    if (!matches.length) {
      throw new CliError(
        "WORKSPACE_UNAVAILABLE",
        "Workspace is unavailable. Run corely workspaces list."
      );
    }
  } else if (workspaces.length === 1) {
    return workspaces[0];
  } else if (!workspaces.length) {
    throw new CliError("WORKSPACE_UNAVAILABLE", "You do not have access to a workspace.");
  }
  throw new CliError(
    "WORKSPACE_REQUIRED",
    "Select a workspace by ID with --workspace. Run corely workspaces list."
  );
}

const args = process.argv.slice(2);
const json = args.includes("--json");

function emit(data: unknown, display: string) {
  process.stdout.write(`${json ? JSON.stringify({ ok: true, data }) : display}\n`);
}

async function run() {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      workspace: { type: "string" },
      tenant: { type: "string" },
      agent: { type: "string" },
      name: { type: "string" },
      fingerprint: { type: "string" },
      operation: { type: "string", multiple: true },
      minutes: { type: "string" },
    },
  });
  const command = positionals.join(" ");
  if (values.version) {
    emit({ version: metadata.version }, metadata.version);
    return;
  }
  if (values.help || !command) {
    emit({ help }, help);
    return;
  }
  if (["agent", "grants", "capabilities", "operations"].includes(positionals[0])) {
    const origin = getOrigin();
    const result = await runAgentCommand(
      positionals,
      values,
      (path, options) => api(origin, path, options),
      (account) => credentialEntry(JSON.stringify([origin, account]), "Corely CLI Agent"),
      async () => {
        const token = (await credentialEntry(origin)).get();
        if (!token) {
          throw new CliError("AUTH_REQUIRED", "Sign in first with corely auth login.");
        }
        return token;
      }
    );
    emit(result, JSON.stringify(result, null, 2));
    return;
  }
  if (!["auth login", "auth logout", "whoami", "workspaces list"].includes(command)) {
    throw new CliError("USAGE", "Unknown command. Run corely --help.");
  }
  if (values.workspace !== undefined && command !== "whoami") {
    throw new CliError("USAGE", "--workspace is supported by whoami.");
  }
  if (command === "auth login" && (json || !process.stdin.isTTY || !process.stderr.isTTY)) {
    throw new CliError("INTERACTION_REQUIRED", "Run corely auth login in an interactive terminal.");
  }

  const origin = getOrigin();
  const credentials = await credentialEntry(origin);
  const token = credentials.get();
  if (command === "auth login") {
    process.stderr.write("Continue sign-in in your web browser.\n");
    const proof = await authorizeInBrowser(origin, async (input) => {
      const result = await api(origin, "start", { method: "POST", body: input });
      return SsoRedirectSchema.parse(result).redirectTo;
    });
    const result = await api(origin, "exchange", { method: "POST", body: proof });
    const { accessToken } = CliSsoSessionSchema.parse(result);
    try {
      if (token) {
        await api(origin, "logout", { method: "POST", accessToken: token, parseJson: false });
      }
      credentials.save(accessToken);
    } catch (error) {
      await api(origin, "logout", { method: "POST", accessToken, parseJson: false }).catch(
        () => {}
      );
      throw error;
    }
    emit({ signedIn: true }, "Signed in. Run corely workspaces list to see your workspaces.");
    return;
  }
  if (command === "auth logout") {
    if (token) {
      await api(origin, "logout", { method: "POST", accessToken: token, parseJson: false });
      credentials.remove();
    }
    emit({ signedIn: false }, "Signed out of Corely CLI.");
    return;
  }
  if (!token) {
    throw new CliError("AUTH_REQUIRED", "Sign in first with corely auth login.");
  }

  const account = CliSsoAccountSchema.parse(await api(origin, "account", { accessToken: token }));
  if (command === "workspaces list") {
    const lines = account.workspaces.map(
      ({ id, name, tenantId, slug }) =>
        `${terminalLabel(name)}	${id}	${tenantId}${slug ? `	${slug}` : ""}`
    );
    emit(
      { workspaces: account.workspaces },
      lines.length ? lines.join("\n") : "No accessible workspaces."
    );
    return;
  }
  const workspace = selectWorkspace(account.workspaces, values.workspace);
  emit(
    {
      user: { id: account.userId, email: account.email, name: account.name },
      tenantId: workspace.tenantId,
      workspace,
    },
    `${terminalLabel(account.email)}
Workspace ${terminalLabel(workspace.name)} (${workspace.id})
Tenant ${workspace.tenantId}`
  );
}

try {
  await run();
} catch (error) {
  let failure = error;
  if (error instanceof HttpError) {
    failure =
      error.status === 401
        ? ["capabilities", "operations"].includes(args.find((arg) => !arg.startsWith("-")) ?? "")
          ? new CliError(
              "AGENT_ACCESS_REQUIRED",
              "The agent grant is unavailable. Ask your workspace manager to verify access."
            )
          : new CliError("AUTH_REQUIRED", "Sign-in expired. Run corely auth login again.")
        : error.status === 403
          ? new CliError("ACCESS_DENIED", "Corely denied access to this account or workspace.")
          : new CliError(
              "REQUEST_FAILED",
              "Corely could not complete this request. Check the sign-in origin and try again."
            );
  } else if (
    error instanceof TypeError &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("ERR_PARSE_ARGS")
  ) {
    failure = new CliError("USAGE", "Invalid command options. Run corely --help.");
  }
  const details =
    failure instanceof CliError
      ? { code: failure.code, message: failure.message }
      : {
          code: "REQUEST_FAILED",
          message: "Could not complete the request. Check the sign-in origin and try again.",
        };
  if (json) {
    process.stdout.write(`${JSON.stringify({ ok: false, error: details })}\n`);
  } else {
    process.stderr.write(`${details.message}\n`);
  }
  process.exitCode = details.code === "USAGE" ? 2 : 1;
}
