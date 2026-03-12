---
name: governance-kit
description: Create and maintain IT governance artifacts for Ruptur (portfolio of assets, POP/SOPs, runbooks, ADRs, postmortems) using the repo's docs/governanca structure and the rule 'use native capabilities first, orchestrate only what is missing'.
---

# Governance Kit (Ruptur)

Use this skill when the user asks to:

- document governance/operations (POPs/SOPs, runbooks, postmortems)
- build a portfolio/asset registry (CMDB-lite)
- define routing/fallback policies (uazapi primary, Baileys contingency)
- standardize templates and repeatable operational workflows

## Operating rules (must follow)

1) **Native-first**: if a provider already delivers a capability (e.g., multi-instance on uazapi), do **not** implement an alternative—only orchestrate it.
2) **Orchestrator mindset**: Ruptur API exposes a single interface and routes by policy, not by personal preference.
3) **No secrets in Git**: never commit tokens, passwords, or private URLs with credentials.

## Where to write

All governance docs live under:

- `docs/governanca/README.md`
- `docs/governanca/portfolio/`
- `docs/governanca/processos/`
- `docs/governanca/pops/`
- `docs/governanca/runbooks/`
- `docs/governanca/templates/`
- `docs/governanca/ativos/registry.yaml`

## Default deliverables (pick minimal set)

- **Portfolio**: update `docs/governanca/portfolio/portfolio-ativos.md` + `capabilities-matrix.md`
- **Process**: update `docs/governanca/processos/{mudancas,incidentes}.md`
- **Procedure (POP)**: add a POP for repetitive operations (connect instance, failover, rotate token)
- **Runbook**: add a runbook for diagnosis + mitigation of a known failure mode
- **ADR**: when a decision changes long-term structure or policy

## Workflow (recommended)

1) Confirm the user goal in business terms (availability, cost, compliance, scale).
2) Identify what is already native in each provider and list the gaps.
3) Update the capability matrix and routing policy before adding new code.
4) Create/adjust POPs + runbooks (templates in `docs/governanca/templates/`).
5) Only then implement orchestration changes in code (if needed).

