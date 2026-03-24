<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.performance-default.md
Não edite manualmente aqui sem promover no STATE.
-->

<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.performance-default.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook — performance default do Jarvis

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Objetivo

Definir a regra institucional para que otimizações de performance já disponíveis no ecossistema:

- subam como padrão em novas sessões
- sejam revisadas no início da sessão
- sejam revisitadas periodicamente durante a execução
- possam receber adições, remoções ou rebaixamentos sem improviso

---

## Regra-base

Toda nova sessão oficial do Jarvis deve iniciar com um **perfil de performance default** documentado.

Esse perfil default só pode incluir capacidades que:

- já existam materialmente no ecossistema
- possam ser auditadas
- não inventem automação inexistente

---

## Capacidades candidatas ao default atual

- `maestro_orchestration`
- `multi_agent_debate_guided`
- `profile_ops`
- `profile_vcfo`
- `profile_vcvo`
- `profile_eggs`
- `state_capitalization_required`
- `rag_context7_reference_required`
- `documentation_and_comment_coverage_required`
- `session_telemetry_basic`
- `github_projects_backlog_linkage`

---

## Revisão obrigatória de performance

O perfil de performance da sessão deve ser revisado:

1. na ativação da sessão
2. ao abrir uma nova frente importante de escopo
3. quando houver mudança relevante de contexto, risco ou prioridade
4. antes de handoff, suspensão ou encerramento
5. durante a execução, em checkpoints frequentes, para decidir:
   - manter
   - adicionar
   - remover
   - rebaixar
   capacidades

---

## Regra de prudência

Capacidade só entra como `ativa` quando existir de verdade.

Se algo ainda estiver:

- só documentado
- só desejado
- só parcialmente implementado

ele deve permanecer como:

- `pendente`
- `debito`
- `automacao_incompleta`

---

## Registro obrigatório

Toda sessão deve registrar, no mínimo:

- capacidades ativas
- capacidades pendentes
- momento da revisão
- motivo de adição, remoção ou rebaixamento
- referência ao backlog/plano mestre quando aplicável

---

## Integração com intake e trace grading

Quando uma revisão de performance consolidar diretriz durável, o fechamento deve apontar para:

- `playbooks/jarvis.intake-gate.md`
- `knowledge/trace-grading.md`
- `templates/jarvis.trace-card.md`

---

## Resultado esperado

As próximas sessões deixam de depender de memória manual para “ligar performance”.

A sessão já nasce com baseline de performance e passa a revisar continuamente se esse baseline:

- continua útil
- precisa ser ampliado
- precisa ser reduzido
- ou precisa ser corrigido
