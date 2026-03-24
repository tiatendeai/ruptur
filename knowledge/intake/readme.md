<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/intake/readme.md
Não edite manualmente aqui sem promover no STATE.
-->

# Fila mínima de intake assistido

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Objetivo

Manter uma fila simples para decidir o que pode subir ao `state` depois de revisão humana, sem transformar o intake em automação falsa.

---

## Estrutura mínima de um item

- `session_id`
- origem do runtime
- artefato candidato
- resumo da evidência
- score do trace
- recomendação do gate
- destino sugerido: `decision`, `knowledge`, `playbook`, `memory` ou `registry`

---

## Fluxo mínimo

1. receber evidência do runtime
2. preencher `templates/jarvis.trace-card.md`
3. gerar trace em `knowledge/traces/trace-<session_id>.md`
4. aplicar `knowledge/trace-grading.md`
5. registrar a decisão humana
6. promover apenas o que virar diretriz durável

---

## Regras

- intake assistido não substitui gate humano
- trace canônico atual usa `trace-<session_id>.md`
- versões alternativas ou históricas podem usar slug e devem declarar isso no cabeçalho
- nada entra no `state` sem evidência rastreável

---

## Saída esperada

Cada item da fila termina como:

- promovido
- mantido como débito
- arquivado como histórico
