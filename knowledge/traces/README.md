<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/traces/readme.md
Não edite manualmente aqui sem promover no STATE.
-->

# Diretório de traces do intake gate

Use este diretório para armazenar traces candidatos à promoção canônica.

## Convenção de nome

- `trace-<session_id>.md` = trace canônico atual da rodada
- `trace-<session_id>-<slug>.md` = variante histórica, complementar ou de transição

## Conteúdo esperado

- card preenchido a partir de `templates/jarvis.trace-card.md`
- score consolidado segundo `knowledge/trace-grading.md`
- links para artefatos no `omega`, `codex/ruptur` e no próprio `state`
- um `slug` curto que identifique a promoção, ativação ou fechamento daquela rodada

## Regra de leitura

- o trace sem slug é a referência atual quando existir
- traces com slug devem declarar no cabeçalho se são histórico, complementar ou substituído
- o arquivo canônico não substitui a decisão final nem o artefato promovido

## Regra

Um trace aqui documenta a evidência do gate; ele não substitui a decisão final nem o artefato canônico promovido.
