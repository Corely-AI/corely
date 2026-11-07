#!/usr/bin/env python3
"""Count a normalized, already-scoped ticket inventory offline. No external writes."""

import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit


def required_text(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} must be a non-empty string")
    return value.strip()


def issue_key(url):
    parsed = urlsplit(required_text(url, "issue url"))
    match = re.fullmatch(r"/([^/]+)/([^/]+)/issues/([1-9][0-9]*)/?", parsed.path)
    if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password or not match:
        raise ValueError("issue url must be an HTTPS issue URL without credentials")
    return (parsed.netloc.casefold(), *[x.casefold() for x in match.groups()])


def normalize_aliases(raw):
    if not isinstance(raw, dict):
        raise ValueError("aliases must be an explicit login-to-person object")
    result = {}
    for login, person in raw.items():
        key = required_text(login, "alias login").casefold()
        label = required_text(person, "person label")
        if key in result and result[key] != label:
            raise ValueError("conflicting case-insensitive alias entries")
        result[key] = label
    return result


def owner_table(rows, aliases, in_progress):
    counts = {}
    shared = 0
    assignments = 0
    for owners, status in rows:
        resolved = {aliases.get(owner, owner) for owner in owners}
        shared += len(resolved) > 1
        assignments += len(resolved)
        for owner in resolved:
            bucket = counts.setdefault(owner, Counter())
            bucket[status] += 1
    table = [
        {
            "owner": owner,
            "total": sum(statuses.values()),
            "inProgress": sum(n for s, n in statuses.items() if s.casefold() == in_progress.casefold()),
            "byStatus": dict(sorted(statuses.items())),
        }
        for owner, statuses in counts.items()
    ]
    table.sort(key=lambda row: (-row["inProgress"], -row["total"], row["owner"].casefold()))
    return table, assignments, shared


def summarize(records, aliases=None, in_progress="In progress"):
    if not isinstance(records, list):
        raise ValueError("input must be a JSON array")
    in_progress = required_text(in_progress, "In progress status")
    alias_map = normalize_aliases(aliases) if aliases is not None else None
    excluded = {"nonIssue": 0, "closed": 0, "unassigned": 0, "identicalDuplicate": 0}
    seen = {}
    rows = []
    statuses = Counter()
    for index, record in enumerate(records, 1):
        if not isinstance(record, dict):
            raise ValueError(f"row {index} must be an object")
        kind = required_text(record.get("kind"), f"row {index} kind").casefold()
        if kind in {"pullrequest", "draftissue", "redacted"}:
            excluded["nonIssue"] += 1
            continue
        if kind != "issue":
            raise ValueError(f"row {index} has an unsupported kind")
        key = issue_key(record.get("url"))
        state = required_text(record.get("state"), f"row {index} state").upper()
        if state not in {"OPEN", "CLOSED"}:
            raise ValueError(f"row {index} has an unsupported issue state")
        raw_owners = record.get("assignees")
        if not isinstance(raw_owners, list):
            raise ValueError(f"row {index} assignees must be login strings in an array")
        owners = tuple(sorted({required_text(x, "assignee").casefold() for x in raw_owners}))
        raw_status = record.get("projectStatus")
        status = "Missing status" if raw_status is None else required_text(raw_status, "projectStatus")
        signature = (state, owners, status)
        if key in seen:
            if seen[key] != signature:
                raise ValueError(f"row {index} conflicts with an earlier copy of the issue; reconcile the snapshot")
            excluded["identicalDuplicate"] += 1
            continue
        seen[key] = signature
        if state == "CLOSED":
            excluded["closed"] += 1
            continue
        if not owners:
            excluded["unassigned"] += 1
            continue
        rows.append((owners, status))
        statuses[status] += 1
    accounts, assignments, shared = owner_table(rows, {}, in_progress)
    result = {
        "uniqueOpenAssignedTickets": len(rows),
        "inProgressStatus": in_progress,
        "uniqueInProgressTickets": sum(n for s, n in statuses.items() if s.casefold() == in_progress.casefold()),
        "byStatus": dict(sorted(statuses.items())),
        "assignments": assignments,
        "sharedTickets": shared,
        "accounts": accounts,
        "excludedRows": excluded,
    }
    if alias_map is not None:
        people, person_assignments, person_shared = owner_table(rows, alias_map, in_progress)
        result.update(people=people, personAssignments=person_assignments, personSharedTickets=person_shared)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--aliases", type=Path, help="Explicitly verified login-to-person JSON mapping")
    parser.add_argument("--in-progress-status", default="In progress")
    args = parser.parse_args()
    try:
        records = json.loads(args.input.read_text(encoding="utf-8-sig"))
        aliases = json.loads(args.aliases.read_text(encoding="utf-8-sig")) if args.aliases else None
        result = summarize(records, aliases, args.in_progress_status)
    except (OSError, ValueError) as exc:
        print(f"Cannot count ticket inventory: {exc}", file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
