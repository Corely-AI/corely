#!/usr/bin/env node
import { parseArgs } from "node:util";
import { HttpError, request } from "@corely/api-client";
import {
  CliDayBriefDateSchema,
  CliDayBriefSchema,
  CliGrantScopeSchema,
  CliTaskCreatedSchema,
  CliTaskCreateInputSchema,
  TaskAssigneeSchema,
  CliSsoAccountSchema,
  CliSsoSessionSchema,
  SsoHandleSchema,
  SsoRedirectSchema,
} from "@corely/contracts/identity/sso";
import metadata from "../package.json";
import { agentAccessToken, runAgentCommand } from "./agent-commands";
import { appointmentCommand, runAppointmentCommand } from "./appointment-commands";
import { authorizeInBrowser } from "./browser-login";
import { CliError } from "./errors";
import { terminalLabel } from "./terminal";

const help = `Corely CLI

Commands
  corely auth login
  corely auth logout [--json]
  corely workspaces list [--json]
  corely whoami [--workspace <id-or-slug>] [--json]
  corely tasks assignees --workspace <id-or-slug> [--json]
  corely tasks create --workspace <id-or-slug> --owner <staff-id>
    --title <title> --due <timestamp> --idempotency-key <key> [--json]
  corely day brief --workspace <id-or-slug> [--date today|YYYY-MM-DD] [--json]
  corely appointments propose --workspace <id-or-slug> --booking <id>
    --start <timestamp> --idempotency-key <key> [--json]
  corely appointments status|apply --workspace <id-or-slug> --review <id> [--json]
  corely appointments message draft --workspace <id-or-slug> --review <appointment-review-id>
    --idempotency-key <key> [--note <text>] [--json]
  corely appointments message status|queue|retry --workspace <id-or-slug> --review <message-review-id>

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

function displayBrief(brief: ReturnType<typeof CliDayBriefSchema.parse>) {
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: brief.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "shortOffset",
  });
  const localTime = (iso: string) => time.format(new Date(iso));
  const lines = [
    `${terminalLabel(brief.workspaceName)} · ${brief.date} · ${brief.timezone}${brief.timezoneSource === "utc-default" ? " (default)" : ""}`,
  ];
  const sections = [
    [
      "Appointments",
      brief.appointments,
      brief.appointments.items.map(
        (item) =>
          `${localTime(item.startAt)} ${item.status} ${terminalLabel(item.id)} · ${item.sourcePath}`
      ),
    ],
    [
      "Coverage conflicts",
      brief.coverage,
      brief.coverage.items.map(
        (item) =>
          `${localTime(item.startAt)} ${terminalLabel(item.appointmentId)} · ${item.sourcePath}`
      ),
    ],
    [
      "Outstanding tasks",
      brief.tasks,
      brief.tasks.items.map(
        (item) =>
          `${terminalLabel(item.title)}${item.dueAt ? ` · due ${localTime(item.dueAt)}` : ""}${item.checklist ? ` · ${item.checklist.done}/${item.checklist.total} steps` : ""} · ${item.sourcePath}`
      ),
    ],
  ] as const;
  for (const [label, section, items] of sections) {
    lines.push(
      `${label} · ${section.status}${section.total === null ? "" : ` · ${section.total}`}${section.observedAt ? ` · as of ${section.observedAt}` : ""}`
    );
    lines.push(...items.map((item) => `  ${item}`));
    if (section.total !== null && section.total > items.length) {
      lines.push(`  Showing ${items.length} of ${section.total}.`);
    }
  }
  return lines.join("\n");
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
      date: { type: "string" },
      owner: { type: "string" },
      title: { type: "string" },
      due: { type: "string" },
      booking: { type: "string" },
      start: { type: "string" },
      review: { type: "string" },
      note: { type: "string" },
      "idempotency-key": { type: "string" },
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
  const genericBrief = command === "operations run day.brief";
  const taskAssignees =
    command === "tasks assignees" || command === "operations run tasks.assignees";
  const taskCreate = command === "tasks create" || command === "operations run tasks.create";
  const appointment = appointmentCommand(command);
  if (
    !genericBrief &&
    !taskAssignees &&
    !taskCreate &&
    !appointment &&
    ["agent", "grants", "capabilities", "operations"].includes(positionals[0])
  ) {
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
  if (command === "day brief" || genericBrief || taskAssignees || taskCreate || appointment) {
    if (positionals[0] === "operations" && !values.agent) {
      throw new CliError("USAGE", "Specify the prepared agent ID with --agent.");
    }
    const origin = getOrigin();
    let scope;
    let accessToken;
    if (values.agent) {
      const parsed = CliGrantScopeSchema.safeParse({
        tenantId: values.tenant,
        workspaceId: values.workspace,
      });
      if (!parsed.success) {
        throw new CliError("USAGE", "Agent commands require --tenant and --workspace IDs.");
      }
      scope = parsed.data;
      accessToken = await agentAccessToken(scope, values.agent, (account) =>
        credentialEntry(JSON.stringify([origin, account]), "Corely CLI Agent")
      );
    } else {
      accessToken = (await credentialEntry(origin)).get();
      if (!accessToken) {
        throw new CliError("AUTH_REQUIRED", "Sign in first with corely auth login.");
      }
      const account = CliSsoAccountSchema.parse(await api(origin, "account", { accessToken }));
      const workspace = selectWorkspace(account.workspaces, values.workspace);
      scope = { tenantId: workspace.tenantId, workspaceId: workspace.id };
    }
    if (appointment) {
      const { review, display } = await runAppointmentCommand(
        appointment,
        values,
        scope,
        (path, body) => api(origin, path, { accessToken, method: "POST", body })
      );
      emit(review, display);
      return;
    }
    if (taskAssignees) {
      const people = TaskAssigneeSchema.array().parse(
        await api(origin, "tasks/assignees", { accessToken, method: "POST", body: scope })
      );
      emit(
        { assignees: people },
        people.map((person) => `${terminalLabel(person.displayName)} · ${person.id}`).join("\n") ||
          "No active task assignees."
      );
      return;
    }
    if (taskCreate) {
      const task = CliTaskCreateInputSchema.safeParse({
        ownerStaffId: values.owner,
        title: values.title,
        dueAt: values.due,
        idempotencyKey: values["idempotency-key"],
      });
      if (!task.success) {
        throw new CliError(
          "USAGE",
          "Specify --owner, --title, --due with an offset, and --idempotency-key."
        );
      }
      const saved = CliTaskCreatedSchema.parse(
        await api(origin, "tasks/create", {
          accessToken,
          method: "POST",
          body: { ...scope, task: task.data },
        })
      );
      emit(
        saved,
        `${saved.status} · ${saved.id}\nOwner ${saved.ownerStaffId} · due ${saved.dueAt}\n${saved.sourcePath}`
      );
      return;
    }
    const date = CliDayBriefDateSchema.safeParse(values.date ?? "today");
    if (!date.success) {
      throw new CliError("USAGE", "Use --date today or a valid YYYY-MM-DD date.");
    }
    const brief = CliDayBriefSchema.parse(
      await api(origin, "day-brief", {
        accessToken,
        method: "POST",
        body: { ...scope, date: date.data },
      })
    );
    emit(brief, displayBrief(brief));
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
        ? (args.some((arg) => arg === "--agent" || arg.startsWith("--agent=")) &&
            (args.includes("brief") || args.includes("tasks"))) ||
          ["capabilities", "operations"].includes(args.find((arg) => !arg.startsWith("-")) ?? "")
          ? new CliError(
              "AGENT_ACCESS_REQUIRED",
              "The agent grant is unavailable. Ask your workspace manager to verify access."
            )
          : new CliError("AUTH_REQUIRED", "Sign-in expired. Run corely auth login again.")
        : error.status === 409 && (args.includes("create") || args.includes("tasks.create"))
          ? new CliError(
              "CONFLICT",
              "The request conflicts with an existing operation. Use a new key for a different task."
            )
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
