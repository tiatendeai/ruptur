<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/projects-linkage.md
Não edite manualmente aqui sem promover no STATE.
-->

# Política local de GitHub Projects linkage

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Objetivo

Garantir que o `state` saiba ligar sessão, backlog e item de board sem depender só de IDs soltos em notas.

---

## Vínculos mínimos

Cada item relevante deve conseguir apontar para:

- `session_id`
- projeto/board
- `project_item_id`
- branch ou commit relacionado
- decisão ou débito associado

---

## Regras

1. `Project Item ID` deve aparecer no trace quando houver vínculo real.
2. Mudança importante sem item de board vira débito ou anotação de reconciliação.
3. Atualização de board não substitui capitalização no `state`.
4. Se a automação não existir, o vínculo continua válido como documentação manual.

---

## Fluxo mínimo

1. identificar o item do backlog
2. registrar o `project_item_id`
3. amarrar o item à sessão
4. atualizar a evidência no trace
5. revisar o vínculo na capitalização
