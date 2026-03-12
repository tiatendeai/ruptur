---
name: support-faq
description: Build and maintain support artifacts for Ruptur (FAQ, troubleshooting guides, known issues, customer-support playbooks) tied to runbooks/POPs and the provider routing model (uazapi primary, Baileys fallback).
---

# Support + FAQ Kit (Ruptur)

Use this skill when the user asks to:

- create FAQs for users/support
- create troubleshooting/diagnostics guides
- structure support/sustaining operations for a multi-tenant WhatsApp stack

## Rules

- Keep support docs consistent with `docs/governanca/runbooks/` and POPs.
- Prefer actionable checklists, not theory.
- Never include secrets (tokens, phone numbers tied to personal identities, etc.).

## Where to write

- FAQs: `docs/suporte/faq.md`
- Known issues: `docs/suporte/known-issues.md`
- Troubleshooting: link to `docs/governanca/runbooks/`
- Procedures: link to `docs/governanca/pops/`

## Workflow

1) Collect the top 5 recurring questions/incidents.
2) For each: write (symptom → likely cause → fix → prevention).
3) Ensure each FAQ points to a runbook/POP when it becomes operational.
4) Keep language accessible (non-technical), but include exact endpoint/command references for the operator section.

