# Private Knowledge procedure collection

[Issue #323](https://github.com/Corely-AI/corely/issues/323) belongs to
[Knowledge #287](https://github.com/Corely-AI/corely/issues/287). The prerequisites
[#298](https://github.com/Corely-AI/corely/issues/298) and
[#302](https://github.com/Corely-AI/corely/issues/302) are closed as completed.
Branch `323-private-procedure-collection` targets `development` from
`87563c1224e89d3f6d52d6fac7181b0ab5b965a8`.

Knowledge publication uses workspace-scoped extension storage for private procedure revisions and
Documents for file ownership and storage. The existing app catalog, permissions,
audit and transactional outbox register this slice. See the
[Knowledge procedure guide](../backend/knowledge-procedures.md).

The issue covers owner and review metadata, page/link/file drafts, publication,
current-version staff access and archive. Search, task/request references and
cited AI answers have their own tickets.

## Verification

| Check                                                                                              | Result                                                                              |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm --filter @corely/api exec vitest run src/modules/knowledge/__tests__/procedures.int.test.ts` | 2 passed on a migrated, disposable PostgreSQL 17 database.                          |
| `pnpm --filter @corely/api... build` and `pnpm --filter @corely/web... build`                      | Both built successfully.                                                            |
| `pnpm locales:check`                                                                               | 602 failures on both base and branch, with identical diagnostics outside Knowledge. |
| `pnpm --filter @corely/web-features typecheck`                                                     | Reports errors in existing cash-management and People tests.                        |

## UI/UX evidence

The Chromium browser check used the Backoffice routes and synthetic API data.
The English desktop author saved a draft and confirmed publication with the
keyboard. The German mobile staff member opened the same route before
publication, after publication and after archiving. The published view fit
390 pixels and exposed only reader actions. The procedure text came from the
synthetic author.

- [Author draft at 1440 × 960](./evidence/323/author-draft.png)
- [Staff reader at 390 × 844](./evidence/323/staff-published.png)

The PostgreSQL suite exercises real procedure and Documents metadata plus an
in-memory object storage provider. Browser routes use synthetic permission and
procedure responses.
