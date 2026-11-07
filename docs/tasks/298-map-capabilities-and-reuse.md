# 298: Map P1/P2 capabilities to code and existing issues

## Tracking and outcome

- Issue: [STR-01 / #298](https://github.com/Corely-AI/corely/issues/298).
- Parent: [EP-STRATEGY / #281](https://github.com/Corely-AI/corely/issues/281); no hard prerequisite.
- Branch: `298-map-capabilities-and-reuse`; intended PR base: `development`.
- Inspected source baseline: `fb7677cbc31715b6bebefe5c6c1f2d838d6be198`, 7 November 2026.
- PR: not created yet.
- Goal: map all 13 P1/P2 apps and all 68 feature keys to source, reuse candidates,
  verified issue/PR history and residual gaps, without treating static evidence as readiness.
- Exclusions: application implementation, new modules/tables, migrations, deployment,
  pilot/adoption decisions, production audits and changes to unrelated tickets.

## Reuse and plan

Reuse the existing 32-app repository alignment and imported backlog; add a focused per-feature
inventory rather than duplicate the strategy or mark proposed apps implemented.

1. Reverify the source inventories and current issue/PR metadata, including closure reasons.
2. Trace representative contracts, use cases, adapters, UI, schemas, manifests and tests.
3. Produce app evidence bundles and a complete feature-by-feature reuse/gap matrix with scoped
   absence claims, unknown readiness and outstanding ownership/adoption decisions.
4. Record retained domains and stale worker, entitlement, public-booking and CI assumptions.
5. Check source links, counts, coverage, formatting and whitespace; deliver a signed commit and
   ticket-specific draft PR. Keep the issue open pending review/integration.

## Verification

| Command or manual check                 | Result and limits                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Source/API inventory                    | 161 issues / 203 PR records, pagination exhausted; 77 legacy closure records and 9 selected merged PRs reconciled. |
| Coverage/source checks                  | PASS: 13 apps, 68 unique features, 17 layer bundles, 149 source paths at the reviewed commit.                      |
| Local link/anchor check                 | PASS: 402 local references across inventory and changed navigation/task documents.                                 |
| Installed Prettier on six changed files | PASS.                                                                                                              |
| Diff/whitespace checks                  | PASS; documentation/JSON/task record only. Staged check repeated before commit.                                    |

Applicable access, concurrency, replay and UI checks belong to the mapped delivery features;
this ticket changes documentation only. Application suites, architecture checks, typecheck and
build were not run for STR-01. The prior push's 1,049 passing/7 skipped unit tests are historical,
not tests of these inventory claims. Its two ESLint errors remain in unchanged files; retain
that limitation if using the documented hook bypass for this prose-only delivery.

The structural/link audit used a temporary validator, not new application tooling. Reviewers can
repeat essential coverage/path checks from the repository root:

```sh
python3 - <<'PY'
import json
from pathlib import Path
p = Path("docs/products/corely/p1-p2-backlog")
d = json.loads((p / "capability-reuse-inventory.json").read_text())
s = json.loads((p / "Corely_P1_P2_Backlog.json").read_text())
assert len(d["apps"]) == 13 and len(d["features"]) == 68
assert {x["key"] for x in d["features"]} == {x["key"] for x in s["issues"] if x["type"] == "Feature"}
assert all(Path(path).exists() for b in d["evidence_bundles"].values() for path in b["paths"])
assert all(x["operational_readiness"] == "unknown" for x in d["features"])
print("Coverage and paths passed; runtime readiness remains unknown.")
PY
```

## UI/UX evidence

N/A: source/issue research and repository documentation, with no product interface changes.

## Impact and remaining work

The focused inventory, structured equivalent, task record and three navigation links are prepared.
No runtime, contract, schema or release behavior changes. Rollback is reverting this documentation
change. The draft PR needs normal review/integration; this ticket and downstream delivery/pilot
gates remain open. No other issue scope, priority, parentage or status was changed.
