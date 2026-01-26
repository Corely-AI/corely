# 🤖 Instructions for AI Agents

This document provides a set of guidelines and context for AI agents working on the Corely codebase.

## 1. Project Overview

Corely is an **AI-native modular ERP** (monolithic repo).

- **Frontend**: Vite + React (`apps/web`), Expo + React Native (`apps/pos`).
- **Backend**: NestJS (`services/api`), Worker (`services/worker`).
- **Packages**: Shared code in `packages/`.
- **Database**: PostgreSQL with Prisma.

## 2. Architecture Principles

- **Modular Monolith**: Strict boundaries between modules in `services/api/src/modules`.
- **Hexagonal Architecture**:
  - `domain`: Pure business logic, no framework dependencies.
  - `application`: Use cases, ports.
  - `infrastructure`: Adapters (Prisma, HTTP, etc.).
- **Contracts**: Shared schemas/types live in `packages/contracts`. Agents should **not** duplicate types across frontend and backend; use contracts.

## 3. Coding Standards

- **Strict TypeScript**: No `any`. Use strict typing.
- **Testing**:
  - Unit tests for domain logic.
  - Integration tests for infrastructure/adapters.
  - E2E tests for critical flows (`apps/e2e`).
- **Naming**:
  - Use `kebab-case` for files.
  - Use `PascalCase` for classes/components.
  - Use `camelCase` for variables/functions.

## 4. Documentation

- When making significant architectural changes, update the relevant docs in `docs/`.
- The documentation is organized in `docs/` and indexed in `docs/README.md`.
  - **Architecture**: `docs/architecture/`
  - **Guides**: `docs/guides/`
  - **Features**: `docs/features/`
  - **Reference**: `docs/guides/QUICK_REFERENCE.md`

## 5. Workflows

- Check `.agent/workflows` for specific operational workflows.

## 6. Common Tasks

- **Creating a new module**: Follow `docs/guides/MODULE_IMPLEMENTATION_GUIDE.md`.
- **Adding a new tool for Copilot**: See `docs/ai/ai-copilot.md` and `docs/ai/COPILOT_STREAMING.md`.
