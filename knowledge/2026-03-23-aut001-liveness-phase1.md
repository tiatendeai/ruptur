<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-23-aut001-liveness-phase1.md
Não edite manualmente aqui sem promover no STATE.
-->

# JARVIS-AUT-001 — fase 1 entregue

**Data:** 2026-03-23  
**Escopo:** primeira entrega concreta de liveness e auto-close auditável no `omega`

---

## O que foi entregue

### No `omega`

- política inicial de liveness:
  - `configs/session-liveness-policy.json`
- script auditável de avaliação:
  - `scripts/session_liveness_guard.py`
- ampliação do contrato de sessão:
  - `protocol/session/session-schema.json`
- registro protocolar da política:
  - `protocol/core/protocol-config.json`
- documentação do comportamento:
  - `README.md`

### Na sessão ativa

- a sessão viva recebeu:
  - `last_activity_at`
  - `last_heartbeat_at`
  - bloco `metadata.liveness`
- a sessão foi marcada como protegida de auto-close porque está em uso real

### No `ruptur`

- o `connectome/status.json` foi sincronizado com:
  - sinais de liveness
  - refs da policy e do script
  - proteção explícita contra fechamento indevido

---

## Regra operacional atual

O mecanismo atual está em **modo report_only**.

Ou seja:

- já classifica sessões
- já consegue apontar candidatas a `stale`
- já consegue apontar candidatas a `auto_close_candidate`
- **mas ainda não deve fechar automaticamente em produção sem a próxima camada de validação**

---

## Evidências de publicação

### Omega

- branch: `chore/omega-session-lifecycle-performance-2026-03-23`
- commit: `b99bdf2`
- PR: https://github.com/tiatendeai/omega/pull/11

### Ruptur

- commit publicado em `main`: `bc1a815d`

### Git Project

- item `JARVIS-AUT-001` movido para `In Progress` no board:
  - `JARVIS OMEGA - Protocolo Lifecycle Board`

---

## O que ainda falta para considerar o AUT-001 resolvido

1. runner periódico da avaliação
2. transição `stale -> closed` com gate explícito
3. testes/validação adicional do fluxo
4. harmonização semântica final com o espelho do `ruptur`
5. registro documentado do runner e dos relatórios no State

---

## 6. Runner periódico e relatórios

- workflow `session-liveness-daily.yml` no `omega` roda o guard de liveness a cada quatro horas
- os relatórios `reports/liveness-report-*.json` ficam disponíveis no runner (não versionados)
- isso torna o AUT-001 auditável e observável, facilitando a revisão manual do gate

Referência:

- `omega/.github/workflows/session-liveness-daily.yml`
- `omega/scripts/session_liveness_guard.py`
5. merge da PR do `omega` em `main`

---

## Critério de prudência preservado

Esta fase mantém a regra central:

- sessão realmente em uso **não** deve ser fechada
- sessão realmente inativa **deve poder** ser encerrada no futuro, com trilha auditável
