# 324. Published procedure discovery

## Tracking and outcome

[Issue #324](https://github.com/Corely-AI/corely/issues/324) belongs to [Knowledge #287](https://github.com/Corely-AI/corely/issues/287).
The published search slice targets [Knowledge publication #537](https://github.com/Corely-AI/corely/pull/537)
at `951be7b775c4081cc0dbd958bc58454dc9c7f0d7`. The other prerequisite drafts are
[Task context #543](https://github.com/Corely-AI/corely/pull/543) and
[Requests #539](https://github.com/Corely-AI/corely/pull/539).

## Reuse

Knowledge continues to own its extension storage, publication status and restricted files.
Search, reader detail, preview and reader downloads all resolve the current publication.
The procedure reader supplies an owner-side `canRead` port for operational references.
References use the stable procedure identifier and follow the latest visible publication.
The browser keeps Knowledge results out of persistent caches and purges previously saved snapshots.

## Verification

The PostgreSQL Knowledge suite passed three tests. The added test exercises draft exclusion,
workspace isolation, case and Unicode normalization, published-only search, current version,
review dates, access revocation and archive. The file test covers archive for a manager using
the reader endpoint. Four offline workspace-scope tests passed, including the private cache purge.

## UI/UX evidence

The Backoffice browser run used synthetic authorized API responses. The author searched by
keywords with the keyboard and saw distinct no-results and retry states. The staff member
opened current instructions at mobile width, then reloaded the same route after an archive
and saw the unavailable state without the previous title or instructions.

- [Published search, English desktop 1440 × 960](./evidence/324/published-search.png)
- [Current reader detail, German mobile 390 × 844](./evidence/324/mobile-published-detail.png)

## Remaining work

Task and Request binding depends on the three prerequisite drafts. This scoped Draft exposes
the published reader and the owning permission check. The app-side bindings belong on the
combined base once the prerequisites are integrated.
