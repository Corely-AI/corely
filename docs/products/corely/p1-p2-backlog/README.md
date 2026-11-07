# Corely P1/P2 GitHub backlog package

This package prepares work for `Corely-AI/corely` and organization Project #1.
It does not itself create GitHub issues or change the repository.

## Live reconciliation

Imported on 7 November 2026 for the existing [Corely organization project](https://github.com/orgs/Corely-AI/projects/1/views/1).
The source specification contains 85 logical entries. The import creates 84 repository
issues and maps `STR-02` to the existing [documentation alignment commit](https://github.com/Corely-AI/corely/commit/26d611e510c785ccad78341f6564ecdcf05de770).
P2 implementation remains conditional; roadmap P1/P2 labels do not change incident urgency.

- [Live issue mapping](corely-p1-p2-issue-map.json): actual issue/project IDs, dispositions, evidence and verification.
- [Import report](import-report.md): counts, relationships, verification limits and execution order.
- [Read-only reconciliation](reconciliation.json): inventory and proposed changes saved before remote writes.

The original manifest and body files below remain planning inputs with prepared/null
remote identifiers. Use the live mapping and stable markers before rerunning; never
create duplicates from those null source fields. Issue creation is not implementation
or production-readiness evidence.

## Run with an authenticated coding agent

Read and execute `Corely_P1_P2_GitHub_Project_Prompt.md`.
It includes the workflow, preservation/deduplication rules, and every ticket body.
Use `Corely_P1_P2_Backlog.json` as a machine-readable duplicate of that specification.

The 85 logical entries comprise 17 epics and 68 features. Existing equivalent work
must be reused, so the number of new GitHub issues can be lower. P2 is conditional.

## Files

- `Corely_P1_P2_GitHub_Project_Prompt.md`: self-contained prompt and all issue specs.
- `EXECUTION_INSTRUCTIONS.md`: instructions only, to use alongside the JSON manifest.
- `Corely_P1_P2_Backlog.json`: all metadata, bodies, dependencies and source notes.
- `Corely_P1_P2_Backlog_Index.md`: coverage and dependency summary.
- `issues/`: one Markdown file for each epic/feature, including a title line.
- `validate_backlog.py`: local structural checks only; no network or GitHub mutations.
- `validation-report.json`: results from those local checks.

Project configuration/permissions and detailed implementation status remain to be
verified live. Null GitHub IDs/URLs mean not yet created or mapped. Do not replace
them with guessed numbers. No assignees, estimates or delivery dates are invented.

In individual body files, remove the initial Markdown title line when passing the
body to GitHub, or use the manifest's `body` field, which is already title-free.
