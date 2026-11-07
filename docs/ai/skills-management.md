# Corely agent skills

Repository skills live in `.agents/skills/<name>/SKILL.md`. They adapt the workflows from
`TruckerPoints/trucker-points` for Corely; they are not a copy of that organization's policy.
Start with [AGENTS](../../AGENTS.md) and the [Corely Engineering Guide](../engineering-guide.md).
Architecture, product strategy and persistence remain in their canonical documents.

| Skill                                                                      | Use for                                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [implement-ticket](../../.agents/skills/implement-ticket/SKILL.md)         | Delivering one ticket through its own scoped branch and draft PR.                           |
| [bug-fix](../../.agents/skills/bug-fix/SKILL.md)                           | Reproduction, root cause and a verified correction; diagnosis-only remains read-only.       |
| [ui-change](../../.agents/skills/ui-change/SKILL.md)                       | User-visible changes with rendered UI/UX checks and review evidence.                        |
| [create-e2e-test](../../.agents/skills/create-e2e-test/SKILL.md)           | Authoring meaningful, isolated Playwright coverage with the correct surface configuration.  |
| [prepare-pull-request](../../.agents/skills/prepare-pull-request/SKILL.md) | Ticket-specific draft PRs, concise descriptions, checks and UI/UX handoff.                  |
| [code-review](../../.agents/skills/code-review/SKILL.md)                   | Concrete evidence-backed diff/PR findings without automatic fixes or posting.               |
| [split-ticket](../../.agents/skills/split-ticket/SKILL.md)                 | Coherent child outcomes, existing-work reuse and safe dependency planning.                  |
| [security-audit](../../.agents/skills/security-audit/SKILL.md)             | A requested scoped trust-boundary review with safe validation and explicit uncertainty.     |
| [release](../../.agents/skills/release/SKILL.md)                           | Preparing or executing an explicitly requested deployment using verified current workflows. |
| [report-tickets](../../.agents/skills/report-tickets/SKILL.md)             | Read-only inventory, owner counts and requested report comparisons/publication.             |

Descriptions route requests; load only the skill and references needed. A skill does not override
user scope, `AGENTS.md` or actual authorization. A review does not grant editing/posting rights;
a ticket or PR does not authorize a release or messages to other people. Existing explicit
authorization remains valid; do not insert new confirmation steps for routine work.

## Corely adaptations

- Commands run from this repository root, not `truckerpoints-src`. Use actual package scripts and
  surface configs, not an assumed `validate:pr` wrapper or absent worker/mock-server runtime.
- Discover the current remote/base. The observed `corely` / `development` differs from checked-in
  `main` CI/deploy triggers; the release skill records this limit instead of modifying infrastructure.
- Every implemented ticket has a separate Draft PR. Visible changes require screenshots/recording
  and manual UI/UX checks before review. Read-only/planning work does not generate empty PRs.
- No imported CTO/reviewer accounts, Slack destinations, alert exemptions, fixed effort targets,
  deployment label engine or mandatory multi-agent audit protocol. Respect actual Corely review
  protection and explicit task requirements.
- The reporting arithmetic helper and its behavioral tests are retained. Security guidance keeps
  relevant generic threat references and adds Corely boundaries; the source's orchestration/report
  validators were not copied because this workflow does not adopt their audit-run contract.

## Maintain and verify

Change the owning skill rather than duplicate it. Keep frontmatter `name`/`description` meaningful,
names in kebab-case and references valid. Put maintained team workflow in the Engineering Guide,
always-on rules in AGENTS, conditional procedures in skills and task-specific evidence in task
records. The PR template is the reviewer-facing summary, not an investigation diary.

Use installed Prettier with explicit hidden `.agents` paths, local link/anchor checks, skill metadata
validation when available and the copied helper's offline tests. Exercise representative decisions:
diagnosis/review stays read-only; ticket delivery produces its own draft PR; missing UI evidence
stays Draft; P2 discovery does not authorize implementation; reporting sends nothing by default;
release preparation performs no deployment. Do not run live workflows just to test these documents.

Agent hosts differ in skill discovery. This repository supplies the standard directory and AGENTS
navigation; automatic loading in every host has not been tested. If a host does not expose a skill,
point it to the exact `SKILL.md` rather than create another library or change global installations.
