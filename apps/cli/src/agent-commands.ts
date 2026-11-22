import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { request } from "@corely/api-client";
import {
  cliAgentProof,
  CliAgentIdSchema,
  CliCapabilitySchema,
  CliGrantInputSchema,
  CliGrantScopeSchema,
  CliGrantSchema,
  CliOperationIdSchema,
  type CliGrantScope,
} from "@corely/contracts/identity/sso";
import { CliError } from "./errors";

type AgentOptions = {
  tenant?: string;
  workspace?: string;
  agent?: string;
  name?: string;
  fingerprint?: string;
  operation?: string[];
  minutes?: string;
};
type Api = (path: string, options: Omit<Parameters<typeof request>[0], "url">) => Promise<unknown>;
export type AgentKeyring = (
  account: string
) => Promise<{ get(): string | null; save(secret: string): void }>;

export async function runAgentCommand(
  commands: string[],
  options: AgentOptions,
  api: Api,
  keyring: AgentKeyring,
  managerToken: () => Promise<string>
) {
  const scope = CliGrantScopeSchema.safeParse({
    tenantId: options.tenant,
    workspaceId: options.workspace,
  });
  if (!scope.success) {
    throw new CliError(
      "USAGE",
      "Specify --tenant and --workspace with the exact IDs from workspaces list."
    );
  }
  const scopeKey = (id: string) =>
    JSON.stringify([scope.data.tenantId, scope.data.workspaceId, id]);
  const pathQuery = new URLSearchParams(scope.data).toString();
  const [group, command, operation] = commands;
  if (group === "agent" && command === "prepare" && commands.length === 2) {
    const agentId = randomUUID();
    const secret = randomBytes(32).toString("base64url");
    const entry = await keyring(agentKey(scope.data, agentId));
    entry.save(secret);
    return {
      ...scope.data,
      agentId,
      fingerprint: createHash("sha256")
        .update(cliAgentProof(scope.data, agentId, secret))
        .digest("hex"),
    };
  }

  if (group === "grants" && commands.length === 2) {
    if (command === "list") {
      const accessToken = await managerToken();
      return CliGrantSchema.array().parse(await api(`grants?${pathQuery}`, { accessToken }));
    }
    if (command === "create") {
      const input = CliGrantInputSchema.safeParse({
        ...scope.data,
        agentId: options.agent,
        name: options.name,
        fingerprint: options.fingerprint,
        operations: options.operation,
        durationMinutes: Number(options.minutes ?? "30"),
      });
      if (!input.success) {
        throw new CliError(
          "USAGE",
          "Specify --agent, --name, --fingerprint and one or more --operation flags. Duration is 1 to 60 minutes."
        );
      }
      const accessToken = await managerToken();
      return CliGrantSchema.parse(
        await api("grants", { accessToken, method: "POST", body: input.data })
      );
    }
    if (command === "revoke") {
      const agentId = requireAgent(options.agent);
      const accessToken = await managerToken();
      return CliGrantSchema.parse(
        await api(`grants/${agentId}/revoke`, {
          accessToken,
          method: "POST",
          body: scope.data,
        })
      );
    }
  }

  const list = group === "capabilities" && command === "list" && commands.length === 2;
  const describe = group === "capabilities" && command === "describe" && commands.length === 3;
  const execute = group === "operations" && command === "run" && commands.length === 3;
  if (!list && !describe && !execute) {
    throw new CliError("USAGE", "Unknown agent command. Run corely --help.");
  }
  const requested = CliOperationIdSchema.safeParse(operation);
  if (!list && !requested.success) {
    throw new CliError("USAGE", "Specify a valid operation ID.");
  }
  const accessToken = await agentAccessToken(scope.data, options.agent, keyring);
  if (execute && requested.success) {
    return api(`operations/${requested.data}`, {
      accessToken,
      method: "POST",
      body: { ...scope.data, input: {} },
    });
  }
  const capabilities = CliCapabilitySchema.array().parse(
    await api(`capabilities?${pathQuery}`, { accessToken })
  );
  if (list) {
    return capabilities;
  }
  const capability = capabilities.find(({ id }) => id === operation);
  if (!capability) {
    throw new CliError("OPERATION_UNAVAILABLE", "This operation is not available to the agent.");
  }
  return capability;
}

function agentKey(scope: CliGrantScope, agentId: string) {
  return JSON.stringify([scope.tenantId, scope.workspaceId, agentId]);
}

export async function agentAccessToken(
  scope: CliGrantScope,
  id: string | undefined,
  keyring: AgentKeyring
) {
  const agentId = requireAgent(id);
  const secret = (await keyring(agentKey(scope, agentId))).get();
  if (!secret) {
    throw new CliError(
      "AGENT_CREDENTIAL_REQUIRED",
      "Prepare the agent on this account before running an operation."
    );
  }
  return `corely-agent.${agentId}.${secret}`;
}

function requireAgent(value?: string) {
  const agentId = CliAgentIdSchema.safeParse(value);
  if (!agentId.success) {
    throw new CliError("USAGE", "Specify the prepared agent ID with --agent.");
  }
  return agentId.data;
}
