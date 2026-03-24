<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/processos/orquestracao-a2a.md
Não edite manualmente aqui sem promover no STATE.
-->

# Orquestracao A2A — modelo operacional do Ruptur

## Objetivo

Padronizar como o `Ruptur` usa multiagentes para entregar fluxo ponta a ponta, sem paralelismo caotico.

## Principios

1. O trabalho nasce no `Ruptur`, nunca nos satelites.
2. O fluxo manda mais que o modulo.
3. Cada tarefa entra em uma trilha e tem definicao de pronto.
4. O `orchestrator` coordena; especialistas executam no proprio dominio.
5. O que foi decidido vira backlog, POP, runbook ou ADR.

## Trilhas oficiais

- `produto`: escopo, prioridade, criterio de aceite
- `aplicacao`: backend, web e integracoes do produto
- `dados`: schema, migrations, consultas, integridade
- `infra`: ambientes, DNS, deploy, health checks, segredos
- `governanca`: processo, ativos, incidentes, documentacao viva

## Fila oficial de trabalho

Todos os itens devem estar em um destes estados:

- `Agora`
- `Depois`
- `Bloqueado`
- `Concluido`

Cada item deve conter:

- objetivo
- trilha
- prioridade
- dono
- dependencias
- criterio de aceite
- risco principal

## Fluxo de execucao

1. `product-owner` ou `project-planner` definem a entrega.
2. `orchestrator` quebra por trilha.
3. Especialistas executam apenas no proprio dominio.
4. `test-engineer` valida o fluxo critico.
5. `documentation-writer` ou `governanca` registram o que muda de forma duradoura.

## Pacotes recomendados de agentes

### Entrega ponta a ponta

- `orchestrator`
- `product-owner`
- `backend-specialist`
- `frontend-specialist`
- `database-architect`
- `test-engineer`

### Migracao de legado

- `orchestrator`
- `explorer-agent`
- `code-archaeologist`
- `backend-specialist`
- `database-architect`

### Infra e operacao

- `orchestrator`
- `devops-engineer`
- `security-auditor`
- `backend-specialist`

## Entregas ponta a ponta prioritarias

### Fase 1

- `conectar canal -> receber lead -> abrir inbox -> mover stage -> responder`
- `criar campanha -> enfileirar -> escolher canal -> despachar -> medir`

## Anti-padroes

- abrir varias frentes sem definicao de pronto
- tratar agentes como opinadores sem backlog
- criar automacao antes de definir regra operacional
- portar codigo dos satelites sem classificar aderencia ao Ruptur

## Artefatos obrigatorios por entrega

- item no backlog
- criterio de aceite
- plano de rollback se houver risco operacional
- registro em doc se a decisao alterar politica, processo ou arquitetura

## Entregas multi-time

Quando mais de um time atua sobre a mesma frente:

- congelar fronteiras antes de abrir execucao paralela
- nomear um dono por trilha e um coordenador unico da entrega
- registrar contratos entre modulos no repositorio
- registrar bloqueios e decisoes no proprio projeto, nao em conversa solta
- evitar que dois times editem o mesmo arquivo central no mesmo ciclo

Referencia ativa:

- `docs/jornada/plano-conjunto-pipeline-agent-2026-03-14.md`
