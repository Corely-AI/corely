# 324. Published procedure discovery

## Tracking and outcome

[Issue #324](https://github.com/Corely-AI/corely/issues/324) belongs to [Knowledge #287](https://github.com/Corely-AI/corely/issues/287).
The Draft targets review base `324-reference-prerequisites` at
`8a7cf4ed58d30d5cfa412738c529dd6f7bbb288a`, which composes
[Knowledge publication #537](https://github.com/Corely-AI/corely/pull/537) at `951be7b7`,
[Task context #543](https://github.com/Corely-AI/corely/pull/543) at `c352862e`, and
[Requests #539](https://github.com/Corely-AI/corely/pull/539) at `62d1923f`.

## Reuse

Knowledge continues to own its extension storage, publication status and restricted files.
Search, reader detail, preview and reader downloads all resolve the current publication.
Task Context uses the Knowledge and Requests owners to authorize each linked record.
Task Context and editable Request drafts can link to a current procedure. Each link
stores a stable identifier and follows the latest visible publication.
The browser keeps Knowledge results out of persistent caches and purges previously saved snapshots.

## Verification

The PostgreSQL Knowledge suite passed three tests. The added test exercises draft exclusion,
workspace isolation, case and Unicode normalization, published-only search, current version,
review dates, access revocation and archive. The file test covers archive for a manager using
the reader endpoint. Four offline workspace-scope tests passed, including the private cache purge.
Three migrated PostgreSQL Task Context tests passed on the combined base, covering the
publish, link, republish, archive and permission-revocation flow.
Five migrated PostgreSQL Request tests passed, including the Nest HTTP endpoint with a
fixture auth guard. The suite checks workspace and user permissions, current publication,
version conflicts, concurrent replay and removing a link.

## UI/UX evidence

The Backoffice browser run used synthetic authorized API responses. The author searched by
keywords with the keyboard and saw distinct no-results and retry states. The staff member
opened current instructions at mobile width, then reloaded the same route after an archive
and saw the unavailable state without the previous title or instructions.
The Request editor accepted a same-origin published reader link with the keyboard,
rejected a different origin and showed the unavailable state after archive.

- [Published search, English desktop 1440 × 960](./evidence/324/published-search.png)
- [Current reader detail, German mobile 390 × 844](./evidence/324/mobile-published-detail.png)
- [Linked procedure inside Task Context, English mobile 390 × 844](./evidence/324/integrated-task-source.png)
- [Linked procedure in a Request draft, English mobile 390 × 844](./evidence/324/request-procedure-link.png)

## Integration base

The review base carries the three prerequisite drafts. The resulting changes should
be retargeted to `development` once its prerequisite changes are present.
