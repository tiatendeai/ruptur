<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/session-git-bridge.md
Não edite manualmente aqui sem promover no STATE.
-->

# Bridge sessão ↔ Git ↔ workflow ↔ backlog

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Finalidade

Definir a trilha mínima para responder, sem improviso:

- qual sessão gerou qual mudança
- qual branch, commit e workflow pertencem a qual `session_id`
- qual item de board originou ou recebeu a execução

---

## Vínculos mínimos esperados

Cada frente relevante deve conseguir apontar para:

1. `session_id`
2. branch
3. commit(s)
4. workflow run
5. issue ou item de project
6. artefato de sessão no Omega

---

## Regra operacional

Quando a automação ainda não fechar o elo inteiro, o handoff ou fechamento da sessão deve registrar explicitamente os links faltantes.

---

## Backlog relacionado

- `JARVIS-AUT-003`
- `JARVIS-REC-015`
