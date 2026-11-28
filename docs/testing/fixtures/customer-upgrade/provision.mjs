import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const api = new URL(process.env.CUSTOMER_UPGRADE_API_URL ?? "http://127.0.0.1:30443");
const output = process.env.CUSTOMER_UPGRADE_STATE;
if (
  !["localhost", "127.0.0.1"].includes(api.hostname) ||
  process.env.CUSTOMER_UPGRADE_DISPOSABLE !== "1" ||
  !output
) {
  throw new Error("Set a disposable local API and private fixture state file.");
}

async function request(path, data, headers = {}) {
  const response = await fetch(new URL(path, api), {
    method: data === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-idempotency-key": randomUUID(), ...headers },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(path + " returned " + response.status + ": " + result.detail);
  return result;
}

async function provision(label) {
  const suffix = randomUUID().slice(0, 8);
  const name = "Customer Upgrade " + label + " " + suffix;
  const { tenantId, accessToken, refreshToken } = await request("/auth/signup", {
    email: suffix + "@example.test",
    password: randomUUID() + "Z9!",
    userName: "Customer Upgrade Owner",
    tenantName: name,
  });
  const headers = { Authorization: "Bearer " + accessToken, "x-tenant-id": tenantId };
  const { workspace } = await request(
    "/workspaces/pilot-setup/start",
    {
      name,
      countryCode: "DE",
      currency: "EUR",
    },
    headers
  );
  headers["x-workspace-id"] = workspace.id;
  await request("/workspaces/" + workspace.id + "/config", undefined, headers);
  const existing = await request(
    "/customers",
    {
      displayName: "Existing Customer",
      kind: "ORGANIZATION",
      organizationName: "Existing Customer GmbH",
    },
    headers
  );
  return {
    tenantId,
    workspaceId: workspace.id,
    existingId: existing.id,
    accessToken,
    refreshToken,
  };
}

const fixture = { acme: await provision("Acme"), standard: await provision("Default") };
writeFileSync(output, JSON.stringify(fixture), { flag: "wx", mode: 0o600 });
console.log("Provisioned two local workspaces and wrote the temporary state.");
