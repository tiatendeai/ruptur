<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.intake-gate.md
Não edite manualmente aqui sem promover no STATE.
-->

<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.intake-gate.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook — Intake com gate para promoção ao STATE

**Status:** ativo  
**Responsável:** State / Diego  
**Última revisão:** 2026-03-23  
**Referências:**  
- `knowledge/trace-grading.md`  
- `templates/jarvis.trace-card.md`  
- `knowledge/traces/README.md`  
- [OpenAI — Trace grading](https://platform.openai.com/docs/guides/trace-grading)  
- [Microsoft Learn — Observability in Generative AI / Foundry](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/evaluation-approach-gen-ai)

---

## 1. Objetivo

Garantir que artefatos do runtime só sejam promovidos ao STATE após evidência estruturada, avaliação humana e gate explícito de capitalização.

## 2. Pipeline do intake

### 2.1 Origem do runtime

- sessão: `omega/sessions/<session_id>`
- manifestação operacional: `codex/ruptur`

### 2.2 Evidência mínima

- trace completo de inputs, contexto lido, tool calls, outputs e validação
- card preenchido a partir de `templates/jarvis.trace-card.md`
- telemetria mínima anexada ao connectome e ao artefato da sessão

### 2.3 Avaliação

- aplicar scorecard com critérios `Clareza`, `Autoridade`, `Confiabilidade`, `Impacto` e `Reversibilidade`
- usar `knowledge/trace-grading.md` para consolidar nota e recomendação de gate

### 2.4 Gate humano

- operador (`diego` ou substituto formalizado) revisa evidências
- a decisão final vira nota de `knowledge/` ou `decisions/`, conforme o caso

### 2.5 Capitalização

- atualizar memória, playbook, registry, decisão ou knowledge correspondente
- arquivar o trace em `knowledge/traces/trace-<session_id>.md`

## 3. Checklist mínimo

- [ ] `session_id` e artifacts registrados em Omega + Ruptur
- [ ] trace card preenchido
- [ ] trace grading preenchido
- [ ] telemetria básica anexada
- [ ] revisão humana documentada
- [ ] atualização do backlog `JARVIS-AUT-005` quando aplicável

## 4. Artefatos gerados

- `knowledge/traces/trace-<session_id>.md`
- decisão, débito ou nota de capitalização
- atualização do artefato canônico afetado

## 5. Resultado esperado

Cada promoção oficial ao STATE passa a ter trilha reproduzível, scorecard visível e gate explícito, evitando autoescrita cega.
