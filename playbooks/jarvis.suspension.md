<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.suspension.md
Não edite manualmente aqui sem promover no STATE.
-->

<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.suspension.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook — suspensão do Jarvis

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Finalidade

Suspender uma sessão sem perder rastreabilidade, contexto e condição de retomada.

---

## Pré-condições

- `session_id` materializado
- artefato oficial no Omega existente
- espelho operacional existente
- motivo da suspensão explicitado
- condição de retomada registrada

---

## Resultado esperado

A sessão fica pausável e retomável sem reconstrução improvisada.
