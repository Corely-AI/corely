import assert from "node:assert/strict";
import { test } from "node:test";
import { AppRegistry } from "../../services/api/src/modules/platform/infrastructure/registries/app-registry";
import { getAppReleaseInventory } from "./inventory";

test("exports every registered app, its version, and its dependencies", () => {
  const registry = new AppRegistry();
  registry.loadManifests();
  const result = getAppReleaseInventory();
  assert.deepEqual(
    result.apps.map(({ appId }) => appId),
    registry
      .list()
      .map(({ appId }) => appId)
      .sort((a, b) => a.localeCompare(b, "en"))
  );
  for (const app of result.apps) {
    const manifest = registry.get(app.appId);
    assert.equal(app.version, manifest?.version);
    assert.deepEqual(app.dependencies, manifest?.dependencies);
  }
  assert.match(result.sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(result.builds.contracts.name, "@corely/contracts");
  assert.ok(result.builds.clients.some(({ name }) => name === "@corely/web"));
  assert.ok(!result.builds.clients.some(({ name }) => name === "@corely/e2e"));
});

test("uses app package manifests without associating the shared workflow package with Core", () => {
  const { apps } = getAppReleaseInventory();
  assert.deepEqual(
    apps.find(({ appId }) => appId === "booking")?.packages.map(({ name }) => name),
    ["@corely/booking", "@corely/booking-ui"]
  );
  assert.deepEqual(apps.find(({ appId }) => appId === "core")?.packages, []);
});
