<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/processos/equipe-resolucao-bugs-dev-infra.md
Não edite manualmente aqui sem promover no STATE.
-->

# Processo — Equipe de Resolucao (Bugs, Desenvolvimento e Infra)

Data de vigencia: 2026-03-15

## Objetivo

Definir a equipe completa de resposta para incidentes e evolucoes do assistente WhatsApp, com papeis claros e handoff objetivo entre bugfix, desenvolvimento e infraestrutura.

## Escopo

- backend de sessao/comandos/roteamento de agentes
- frontend operacional (Conexoes, MyChat, CRM)
- deploy/runtime/observabilidade
- seguranca operacional e risco de abuso/banimento
- integridade de dados e normalizacao

## Times e responsabilidades

| trilha | agente primario | responsabilidade principal |
|---|---|---|
| coordenacao | `orchestrator` | priorizacao, ordem de execucao e alinhamento multi-time |
| investigacao | `debugger` | reproducao, causa raiz e estrategia de correcao |
| desenvolvimento backend | `backend-specialist` | APIs, sessao, comandos, ingestao, provider adapter |
| desenvolvimento frontend | `frontend-specialist` | tela de operacao, UX de ativacao, status e controle |
| dados | `database-architect` | schema, normalizacao, migracao e consistencia |
| infraestrutura | `devops-engineer` | deploy, rollback, health checks, logs, runtime |
| testes | `test-engineer` | regressao funcional e cobertura minima |
| automacao de QA | `qa-automation-engineer` | smoke/E2E e automacao de validacoes |
| seguranca | `security-auditor` | auth challenge, abuso, protecao de conta e compliance |
| legado e arqueologia | `code-archaeologist` | leitura de drift, diffs e impacto historico |
| documentacao | `documentation-writer` | RUP, runbooks, POPs e changelog operacional |
| planejamento | `project-planner` | backlog, criticidade, criterio de aceite |

## Fluxo padrao de acionamento

1. Abrir incidente com ID `RUP-YYYY-NNN`.
2. Acionar `orchestrator + debugger + devops-engineer`.
3. Incluir `backend-specialist` e/ou `frontend-specialist` conforme superficie afetada.
4. Incluir `security-auditor` se houver risco de bloqueio, spam, loop ou exposicao de dados.
5. Incluir `database-architect` quando houver normalizacao/migracao.
6. Validar com `test-engineer` e `qa-automation-engineer`.
7. Fechar com `documentation-writer` atualizando docs obrigatorias.

## Regra de fechamento

Somente marcar como concluido quando:

- codigo estiver em producao com validacao minima registrada
- rollback estiver documentado
- registro RUP existir em `docs/jornada/correcoes/`
- runbook/processo afetado tiver sido atualizado
