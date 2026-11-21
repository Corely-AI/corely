import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";

const api = new URL(process.env.INVOICE_UPGRADE_API_URL ?? "http://127.0.0.1:30441");
const output = process.env.INVOICE_UPGRADE_STATE;
if (
  !["localhost", "127.0.0.1"].includes(api.hostname) ||
  process.env.INVOICE_UPGRADE_DISPOSABLE !== "1" ||
  !output
) {
  throw new Error("Set the disposable local API and a private fixture state path.");
}
async function post(path, data, headers = {}) {
  const response = await fetch(new URL(path, api), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-idempotency-key": randomUUID(),
      ...headers,
    },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(path + " returned " + response.status + ": " + result.detail);
  return result;
}
async function provision(label) {
  const suffix = randomUUID().slice(0, 8);
  const name = "Invoice Upgrade " + label + " " + suffix;
  const { tenantId, accessToken, refreshToken } = await post("/auth/signup", {
    email: suffix + "@example.test",
    password: randomUUID() + "Z9!",
    userName: "Invoice Upgrade Owner",
    tenantName: name,
  });
  const headers = { Authorization: "Bearer " + accessToken, "x-tenant-id": tenantId };
  const { workspace } = await post(
    "/workspaces/pilot-setup/start",
    {
      name,
      countryCode: "DE",
      currency: "EUR",
    },
    headers
  );
  headers["x-workspace-id"] = workspace.id;
  const config = await fetch(new URL("/workspaces/" + workspace.id + "/config", api), { headers });
  if (!config.ok) throw new Error("Workspace configuration returned " + config.status);
  const customer = await post(
    "/customers",
    {
      displayName: "Example Customer",
      email: "customer@example.test",
      billingAddress: {
        line1: "Example Street 1",
        city: "Berlin",
        postalCode: "10115",
        country: "DE",
      },
    },
    headers
  );
  const values = {
    customerPartyId: customer.id,
    currency: "EUR",
    lineItems: [{ description: "Consulting", qty: 1, unitPriceCents: 10000 }],
  };
  const { invoice: draft } = await post("/invoices", values, headers);
  const { invoice: dated } = await post("/invoices", { ...values, dueDate: "2030-12-31" }, headers);
  const issued = await post("/invoices/" + dated.id + "/finalize", {}, headers);
  return {
    tenantId,
    workspaceId: workspace.id,
    invoiceId: draft.id,
    existingInvoiceId: issued.id,
    existingInvoiceNumber: issued.number,
    customerId: customer.id,
    accessToken,
    refreshToken,
  };
}

const fixture = { acme: await provision("Acme"), standard: await provision("Default") };
writeFileSync(output, JSON.stringify(fixture), { flag: "wx", mode: 0o600 });
console.log("Provisioned two local workspaces and wrote the temporary fixture state.");
