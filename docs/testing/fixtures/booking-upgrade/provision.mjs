import { randomUUID } from "node:crypto";

const target = new URL(process.env.OPENBUK_UPGRADE_API_URL ?? "http://127.0.0.1:30437");
if (
  !["127.0.0.1", "localhost"].includes(target.hostname) ||
  process.env.OPENBUK_UPGRADE_DISPOSABLE !== "1"
) {
  throw new Error("Explicitly select the isolated local Booking upgrade installation.");
}

async function post(path, data, headers = {}) {
  const response = await fetch(new URL(path, target), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-idempotency-key": randomUUID(), ...headers },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(path + " returned " + response.status + ": " + result.detail);
  }
  return result;
}

async function provision(name) {
  const id = randomUUID().slice(0, 8);
  const studioName = "Booking Upgrade " + name + " " + id;
  const { accessToken, tenantId } = await post("/auth/signup", {
    email: "booking-upgrade-" + id + "@example.test",
    password: randomUUID() + "Z9!",
    userName: "Booking Upgrade Owner",
    tenantName: studioName,
  });
  const auth = { Authorization: "Bearer " + accessToken, "x-tenant-id": tenantId };
  const { workspace } = await post(
    "/workspaces/pilot-setup/start",
    {
      name: studioName,
      countryCode: "DE",
      currency: "EUR",
    },
    auth
  );
  const { studio } = await post(
    "/openbuk/studio/publish",
    {
      studioName,
      timezone: "UTC",
      locale: "en",
      currency: "EUR",
      serviceName: "Booking Upgrade Service",
      staffName: "Booking Upgrade Staff",
      durationMinutes: 120,
      priceCents: 3500,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      minimumNoticeMinutes: 60,
      maximumAdvanceDays: 14,
      weeklyHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        startTime: "09:00",
        endTime: "18:00",
      })),
      blockedTimes: [],
    },
    { ...auth, "x-workspace-id": workspace.id }
  );
  return { tenantId, workspaceId: workspace.id, slug: studio.slug };
}

console.log(
  JSON.stringify({ acme: await provision("Acme"), standard: await provision("Default") }, null, 2)
);
