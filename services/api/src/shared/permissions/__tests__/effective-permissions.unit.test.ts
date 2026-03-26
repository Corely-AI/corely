import { describe, expect, it } from "vitest";
import type { RolePermissionEffect } from "@corely/contracts";
import {
  computeEffectivePermissionSet,
  hasPermission,
  toAllowedPermissionKeys,
} from "../effective-permissions";

describe("Effective permission computations", () => {
  it("deduplicates allows, honors deny precedence, and exposes allowAll", () => {
    const grants: Array<{ key: string; effect: RolePermissionEffect }> = [
      { key: "menu.view", effect: "ALLOW" },
      { key: "menu.view", effect: "DENY" },
      { key: "menu.edit", effect: "ALLOW" },
      { key: "menu.edit", effect: "ALLOW" },
      { key: "*", effect: "ALLOW" },
    ];

    const set = computeEffectivePermissionSet(grants);
    expect(set.allowAll).toBe(true);
    expect(set.denied.has("menu.view")).toBe(true);
    expect(set.allowed.has("menu.view")).toBe(false);
    expect(set.allowed.has("menu.edit")).toBe(true);

    expect(hasPermission(set, "menu.view")).toBe(false);
    expect(hasPermission(set, "menu.edit")).toBe(true);
    expect(hasPermission(set, "unknown.permission")).toBe(true);

    const allowed = toAllowedPermissionKeys(grants);
    expect(new Set(allowed)).toEqual(new Set(["menu.edit"]));
  });

  it("expands cash permissions into POS register compatibility aliases", () => {
    const grants: Array<{ key: string; effect: RolePermissionEffect }> = [
      { key: "cash.read", effect: "ALLOW" },
      { key: "cash.write", effect: "ALLOW" },
    ];

    const set = computeEffectivePermissionSet(grants);

    expect(hasPermission(set, "cash.read")).toBe(true);
    expect(hasPermission(set, "cash.write")).toBe(true);
    expect(hasPermission(set, "pos.registers.read")).toBe(true);
    expect(hasPermission(set, "pos.transactions.read")).toBe(true);
    expect(hasPermission(set, "pos.registers.manage")).toBe(true);

    const allowed = new Set(toAllowedPermissionKeys(grants));
    expect(allowed.has("pos.registers.read")).toBe(true);
    expect(allowed.has("pos.transactions.read")).toBe(true);
    expect(allowed.has("pos.registers.manage")).toBe(true);
  });

  it("applies deny precedence to compatibility aliases", () => {
    const grants: Array<{ key: string; effect: RolePermissionEffect }> = [
      { key: "cash.read", effect: "ALLOW" },
      { key: "cash.read", effect: "DENY" },
    ];

    const set = computeEffectivePermissionSet(grants);

    expect(hasPermission(set, "cash.read")).toBe(false);
    expect(hasPermission(set, "pos.registers.read")).toBe(false);
  });

  it("expands legacy catalog quick-write grants into catalog.quickwrite", () => {
    const grants: Array<{ key: string; effect: RolePermissionEffect }> = [
      { key: "catalog.quick-write", effect: "ALLOW" },
    ];

    const set = computeEffectivePermissionSet(grants);

    expect(hasPermission(set, "catalog.quick-write")).toBe(true);
    expect(hasPermission(set, "catalog.quickwrite")).toBe(true);

    const allowed = new Set(toAllowedPermissionKeys(grants));
    expect(allowed.has("catalog.quickwrite")).toBe(true);
  });
});
