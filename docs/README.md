# Documentation

Corely is a collection of connected, AI-native apps for running a team’s
internal operations. Teams start with the capabilities they need and expand
into finance and specialist operations as their work demands.

Finance is optional; accounting is not a prerequisite for operational apps.
Implementation evidence, target design and unvalidated hypotheses are kept separate.

## Engineering workflow

- [Corely Engineering Guide](./engineering-guide.md) — ticket delivery, verification, PRs and UI/UX review
- [Agent skills](./ai/skills-management.md) — task-specific workflows customized for this repository

## Product direction

- [Corely strategy](./products/corely/README.md)
- [Long-term 32-app map](./products/corely/app-catalog.md) — not a delivery or availability commitment
- [Focused launch proposal](./products/corely/launch-plan.md) — Schedule, Team, Daily Work
- [Pilot booking decision](./products/corely/pilot-booking-decision.md) — OpenBuk replacement, staff surface and cutover gates
- [Pilot research protocol](./products/corely/pilot-research-protocol.md) — hypotheses, baseline measures and evidence handling
- [Conditional P2 promotion criteria](./products/corely/p2-promotion-criteria.md) — eight epic-specific evidence checklists; no implementation commitment
- [P1/P2 backlog package](./products/corely/p1-p2-backlog/README.md) — issue specifications and live project reconciliation
- [P1/P2 capability reuse inventory](./products/corely/p1-p2-backlog/capability-reuse-inventory.md) — current owners, evidence and residual gaps for all 68 features
- [Repository alignment and discrepancies](./products/corely/repository-alignment.md)
- [Connected-app architecture and ownership](./architecture/connected-apps.md)
- [Positioning decision](./decisions/ADR-0002-connected-operations-apps.md)

Dated implementation/status reports retain historical context; they do not prove
current readiness or authorize implementing the catalog.

## Structure

### 🏗 Architecture

High-level design, boundaries, and core decisions.

- [Architecture Overview](./architecture/architect.md)
- [Boundaries](./architecture/BOUNDARIES.md)
- [Overall Structure](./architecture/overall-structure.md)
- [Integrations Capability Layer](./architecture/integrations-capability-layer.md)
- [Ports & Adapters](./architecture/ports-adapters-migration.md)
- [SSE Streaming](./architecture/sse-streaming.md)
- [Offline First](./architecture/offline-first.md)
- [Offline Implementation](./architecture/offline-implementation.md)

### 🤖 AI & Copilot

Design and implementation of the AI features.

- [AI Copilot](./ai/ai-copilot.md)
- [Streaming Architecture](./ai/COPILOT_STREAMING.md)
- [Streaming Implementation](./ai/copilot-streaming.md)
- [Prompt Management](./ai/prompt-management.md)

### ⚙️ Backend

Backend specific documentation.

- [Auth](./backend/AUTH.md)
- [Background Module](./backend/background.md)
- [Events](./backend/EVENTS.md)
- [Dependency Injection](./di/)
- [Observability](./observability/)
- [Retries](./retries/)

### 🎨 Frontend

Frontend guidelines and specific docs.

- [Brand](./frontend/BRAND.md)
- [Menu](./menu/)
- [CRUD and operational entry-point standard](./frontend/crud-ui-standard.md)
- [List View Standard](./frontend/list-view-implementation.md)
- [Shared UI Package](./frontend/shared-ui.md)

### 🚀 DevOps & Infra

Deployment, configuration, and infrastructure.

- [Docker](./devops/DOCKER.md)
- [Configuration](./devops/configuration.md)
- [Background Runtime](./devops/background-runtime.md)
- [Customization](./devops/customization.md)
- [Licensing](./devops/licensing.md)

### 🧪 Testing

Testing strategies and E2E guides.

- [Testing Guide](./testing/TESTING.md)
- [E2E Testing](./testing/E2E.md)

### 📦 Features & Modules

Specific feature implementation details.

- [Inventory Notes](./features/INVENTORY_NOTE.md)
- [POS Implementation](./features/POS_IMPLEMENTATION_STATUS.md)
- [POS Offline Runtime](./features/POS_OFFLINE_RUNTIME.md)
- [Workspace Implementation](./features/WORKSPACE_IMPLEMENTATION_SUMMARY.md)
- [Accounting Core Status](./features/ACCOUNTING_CORE_STATUS.md)
- [Accounting Frontend Progress](./features/ACCOUNTING_FRONTEND_PROGRESS.md)
- [CRM Implementation Summary](./features/CRM_IMPLEMENTATION_SUMMARY.md)
- [CRM AI](./features/crm-ai.md)
- [Implementation Progress](./features/IMPLEMENTATION_PROGRESS.md)
- [CMS Module](./features/CMS.md)
- [Website Module](./features/website.md)
- [Issues Module](./features/issues.md)
- [Classes Module](./features/CLASSES.md)
- [Students Module](./features/STUDENTS.md)
- [Payment Methods](./features/PAYMENT_METHODS_IMPLEMENTATION.md)
- [Async PDF Download & Long Jobs](./features/invoice-pdf-download.md)
- [Invoice Copilot MVP](./features/invoice-copilot-mvp.md)
- [Tax Snapshot](./features/TAX_SNAPSHOT_IMPLEMENTATION.md)
- [Catalog Module](./features/catalog.md)
- [Custom Attributes Framework](./features/custom-attributes.md)
- [Command Palette](./features/command-palette.md)
- [Coaching Engagements](./features/coaching-engagements.md)

### 📚 Guides

General developer guides and references.

- [Implementation Summary](./guides/IMPLEMENTATION_SUMMARY.md)
- [Module Implementation Guide](./guides/MODULE_IMPLEMENTATION_GUIDE.md)
- [Quick Reference](./guides/QUICK_REFERENCE.md)
- [Module Template](./guides/MODULE-TEMPLATE.md)
- [Debug Stream](./guides/DEBUG_STREAM.md)
- [Environment Setup](./guides/ENV_SETUP.md)
- [POS Vertical Packs](./guides/POS_VERTICAL_PACKS.md)
- [Vercel Surface Proxy](./guides/VERCEL_SURFACE_PROXY.md)
- [Security Guide](./guides/SECURITY.md)
- [Ghi doanh thu tiền mặt](./guides/GHI_DOANH_THU_TIEN_MAT.md)
- [Nộp tiền mặt vào ngân hàng](./guides/NOP_TIEN_MAT_VAO_NGAN_HANG.md)
- [Bỏ tiền cá nhân vào quầy làm tiền thối (Privateinlage)](./guides/PRIVATEINLAGE_TIEN_THOI.md)
- [Tạo Kassenabrechnung tháng 7 và dịch sang tiếng Đức](./guides/KASSENABRECHNUNG_THANG_7.md)
- [PDF hướng dẫn quản lý tiền mặt trên điện thoại](./guides/huong-dan-quan-ly-tien-mat-mobile.pdf)
- [Import Style](./import-style.md)
- [Legacy Implementation Summary](./guides/ROOT_IMPLEMENTATION_SUMMARY.md)

### 📂 Other Resources

- [Historical plans and status reports](./archive/README.md)

- [Platform Menu API](./platform/menu.md)
- [Operational package configuration](./platform/operational-package.md) — existing OpenBuk client, manifest composition and independent access gates
- [Tenant Features And Menu Permissions](./platform/tenant-features-and-menu-permissions.md)
- [Best Practices](./best-practices/)
- [Conventions](./conventions/)
- [Decisions](./decisions/)
- [Platform](./platform/)
- [Workflows](./workflows/)
- [Trademarks](./TRADEMARKS.md)

## Products

- [OpenBuk](products/openbuk/README.md) — focused booking product and implementation roadmap.
- [OpenBuk screenshot walkthrough](products/openbuk/screenshots.md)
