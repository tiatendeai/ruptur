<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/context7-governance.md
Não edite manualmente aqui sem promover no STATE.
-->

# Política local de Context7 / RAG

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Objetivo

Definir como o `state` consome Context7/RAG sem assumir que o contexto operacional está sempre fresco.

---

## Regras

1. Context7 é referência de apoio, não autoridade final.
2. Conteúdo com data operacional precisa de revisão periódica.
3. Mudança estrutural no runtime exige checagem de drift em `RAG/CONTEXT7.md`.
4. Diretriz durável só sobe ao `state` depois de capitalização explícita.
5. Se o contexto estiver ambíguo, registrar como débito em vez de inferir demais.

---

## Sinais de frescor

- `last_validated_at`
- responsável pela revisão
- origem da evidência
- diferença entre documento e runtime

---

## Fluxo mínimo

1. ler `RAG/CONTEXT7.md`
2. comparar com runtime e com notas de sessão
3. registrar divergência
4. promover apenas o que estiver estável
5. atualizar a política quando a regra mudar
