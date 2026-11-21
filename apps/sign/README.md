# Corely Sign

Run `pnpm dev:sign` from the repository root. The focused Vite client listens on port 5184 and proxies `/api` to the local Corely API on port 3000. Use `/sign` for the overview and `/sign/requests/:id` for a specific request. Signing in returns the sender to the requested screen.

The client owns its entry point, workspace selector and navigation. It shares the Sign screens in `packages/web-features` with the administration client. Both clients use the same workspace permissions, templates and requests. Recipient invitations open the public signing site configured by the API.

Use `pnpm --filter @corely/sign typecheck` and `pnpm --filter @corely/sign build` to check the focused client. A production build requires a corresponding-source URL at `/source/corely-sign-<40-character-commit>.zip` via `VITE_SIGN_SOURCE_URL`. Configure the host to serve the SPA entry point for client routes and forward authenticated API requests to Corely.
