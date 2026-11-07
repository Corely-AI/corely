#!/usr/bin/env python3
"""Validate the local Corely planning manifest. No network calls or mutations."""
from __future__ import annotations
import json
import sys
from pathlib import Path
from collections import Counter
from typing import Any


def check(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def topological_count(graph: dict[str, set[str]]) -> int:
    remaining = {key: set(deps) for key, deps in graph.items()}
    count = 0
    while remaining:
        ready = {key for key, deps in remaining.items() if not deps}
        check(bool(ready), f"Dependency cycle among {sorted(remaining)}")
        for key in ready:
            del remaining[key]
        for deps in remaining.values():
            deps.difference_update(ready)
        count += len(ready)
    return count


def validate(manifest_path: Path) -> dict[str, Any]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    rows = data["issues"]
    keys = [row["key"] for row in rows]
    check(len(rows) == 85, "Expected 85 baseline logical entries")
    check(len(keys) == len(set(keys)), "Duplicate planning keys")
    epics = {row["key"]: row for row in rows if row["type"] == "Epic"}
    features = {row["key"]: row for row in rows if row["type"] == "Feature"}
    check(len(epics) == 17 and len(features) == 68, "Epic/feature count mismatch")
    check(Counter(r["priority"] for r in epics.values()) == {"P1": 9, "P2": 8}, "Epic scope count mismatch")
    check(Counter(r["priority"] for r in features.values()) == {"P1": 38, "P2": 30}, "Feature scope count mismatch")
    expected_apps = {1, 2, 3, 4, 5, 11, 12, 16, 18, 21, 26, 27, 28}
    actual_apps = {app for row in rows for app in row["apps"]}
    check(actual_apps == expected_apps, "Missing app or out-of-scope app")
    for row in rows:
        key = row["key"]
        check(row["priority"] in {"P1", "P2"}, f"Invalid scope: {key}")
        marker = f"<!-- corely-backlog:corely-internal-ops-v1:{key} -->"
        check(row["body"].count(marker) == 1, f"Missing/duplicate marker: {key}")
        check("## Current state / reuse evidence" in row["body"], f"Missing evidence section: {key}")
        check(row["publication_status"] == "prepared-not-created", f"Unexpected creation claim: {key}")
        check(row["implementation_status"] == "unverified", f"Unexpected implementation claim: {key}")
        for field in ("github_issue_url", "github_issue_number", "github_node_id", "project_item_id"):
            check(row[field] is None, f"Unexpected remote identifier in unexecuted plan: {key}/{field}")
        if row["priority"] == "P2":
            check(bool(row["conditional_implementation_gate"]), f"Missing P2 gate: {key}")
        body_path = manifest_path.parent / row["body_file"]
        check(body_path.exists(), f"Missing body file: {body_path}")
        expected = f"# {row['github_title']}\n\n{row['body']}"
        check(body_path.read_text(encoding="utf-8") == expected, f"Body/manifest mismatch: {key}")
    graph: dict[str, set[str]] = {}
    for key, row in features.items():
        check(row["parent"] in epics, f"Missing parent: {key}")
        parent = epics[row["parent"]]
        check(key in parent["children"], f"Parent lacks child reference: {key}")
        check(parent["priority"] == row["priority"], f"Parent scope mismatch: {key}")
        check(len(row["acceptance"]) >= 3 and bool(row["verification"]), f"Incomplete specification: {key}")
        deps = row["dependencies"]
        check(len(deps) == len(set(deps)), f"Duplicate dependency: {key}")
        check(all(dep in features and dep != key for dep in deps), f"Invalid dependency: {key}")
        if row["priority"] == "P1":
            check(all(features[d]["priority"] == "P1" for d in deps), f"P1 depends on conditional P2: {key}")
        graph[key] = set(deps)
    for key, row in epics.items():
        expected = {k for k, v in features.items() if v["parent"] == key}
        check(set(row["children"]) == expected, f"Epic children mismatch: {key}")
    check(topological_count(graph) == 68, "Not all features topologically covered")
    gated = {k: set(ds) for k, ds in graph.items()}
    for key, row in features.items():
        if row["priority"] == "P2":
            gated[key].add("REL-04")
    check(topological_count(gated) == 68, "Conditional gate graph is cyclic")
    order = data["metadata"]["feature_topological_order"]
    check(len(order) == 68 and set(order) == set(features), "Invalid suggested execution order")
    positions = {key: pos for pos, key in enumerate(order)}
    check(all(positions[d] < positions[k] for k, ds in graph.items() for d in ds), "Topological order violates a prerequisite")
    return {
        "result": "PASS", "scope": "Local structural/content consistency checks only; not GitHub creation or code verification",
        "logical_entries": 85, "epics": 17, "features": 68,
        "P1": {"epics": 9, "features": 38}, "P2": {"epics": 8, "features": 30},
        "catalog_apps_covered": sorted(actual_apps), "hard_dependency_edges": sum(map(len, graph.values())),
        "hard_graph_acyclic": True, "graph_with_conditional_promotion_acyclic": True,
        "all_body_files_match_manifest": True, "remote_mutations_performed": False,
        "project_configuration_verified": False,
    }


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name("Corely_P1_P2_Backlog.json")
    try:
        report = validate(path)
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as exc:
        print(f"Validation failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
    print(json.dumps(report, ensure_ascii=False, indent=2))
