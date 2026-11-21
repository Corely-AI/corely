import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
import { createGcsClient, GcsObjectStorageAdapter } from "@corely/storage";
import { expect } from "vitest";
import type { RequestRef } from "../domain/ceremony";
export async function restoreFixture(
  ref: RequestRef,
  artifactSha256: string,
  objects: Map<string, Buffer>
) {
  const container = process.env.SIGN_RESTORE_FIXTURE_CONTAINER;
  if (!container) {
    return;
  }
  const databaseUrl = process.env.SIGN_TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw Error("Restore fixture requires SIGN_TEST_DATABASE_URL");
  }
  const source = new URL(databaseUrl);
  if (
    !/^corely-sign-ceremony-[a-f0-9]{8}$/.test(container) ||
    source.hostname !== "127.0.0.1" ||
    source.pathname !== "/sign_test_ceremony" ||
    !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.SIGN_FIXTURE_STORAGE_URL ?? "")
  ) {
    throw Error("Restore fixture requires local isolated database and object emulator");
  }
  const run = (...args: string[]) =>
    execFileSync("docker", ["exec", container, ...args], { encoding: "utf8", timeout: 30000 });
  const port = execFileSync("docker", ["port", container, "5432/tcp"], { encoding: "utf8" }).trim();
  expect(port).toBe("127.0.0.1:" + source.port);
  const id = randomUUID().replaceAll("-", ""),
    restore = "sign_restore_" + id,
    path = "/tmp/" + restore + ".dump";
  run("pg_dump", "-U", "postgres", "-Fc", "-f", path, "sign_test_ceremony");
  run("createdb", "-U", "postgres", restore);
  run("pg_restore", "--exit-on-error", "--no-owner", "-U", "postgres", "-d", restore, path);
  if (!/^[a-f0-9-]{36}$/.test(ref.requestId)) {
    throw Error("Invalid fixture request");
  }
  expect(
    run(
      "psql",
      "-U",
      "postgres",
      "-d",
      restore,
      "-At",
      "-c",
      `SELECT "artifactSha256" FROM platform."SignCeremony" WHERE status='COMPLETED' AND "requestId"='${ref.requestId}'`
    ).trim()
  ).toBe(artifactSha256);
  const client = createGcsClient({
      projectId: "sign-fixture",
      apiEndpoint: process.env.SIGN_FIXTURE_STORAGE_URL,
    }),
    target = "sign-restore-" + id;
  await client.createBucket(target);
  const restored = new GcsObjectStorageAdapter(client, target);
  const original = new GcsObjectStorageAdapter(client, "sign-fixture");
  for (const objectKey of objects.keys()) {
    const address = { objectKey, tenantId: ref.tenantId },
      bytes = await original.getObject(address);
    await restored.putObject({ ...address, contentType: "application/pdf", bytes });
    const retrieved = await restored.getObject(address);
    expect(retrieved.equals(bytes)).toBe(true);
  }
  expect(
    [...objects.values()].some(
      (b) => createHash("sha256").update(b).digest("hex") === artifactSha256
    )
  ).toBe(true);
}
