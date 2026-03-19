# Governanca Operacional — Assistente WhatsApp MVP

Este diretorio consolida a documentacao viva para o MVP do assistente por sessao no WhatsApp, com:

- UAZAPI como provedor principal
- Baileys como contingencia
- sessao explicita por conversa
- contexto compartilhado entre agentes
- operacao orientada a custo, fallback, rastreabilidade e governanca

## Objetivos

- transformar o escopo definido nesta rodada em artefatos executaveis
- reduzir ambiguidade entre produto, aplicacao, infra e operacao
- padronizar setup, integracao, sustentacao e fallback
- preparar a base para publicacao em backlog, GitHub Projects e producao
- garantir que o MVP nao acople a Ruptur ao contrato de um provider externo

## Estrutura

- `api/`: contrato OpenAPI do modulo de sessao/comandos seguindo o estilo do spec UAZAPI
- `adr/`: decisao arquitetural do MVP
- `ativos/`: inventario minimo do servico, provedores, canais e riscos
- `blueprints/`: desenho operacional e arquitetural do produto
- `manuais/`: guias de integracao, setup e sustentacao
- `playbooks/`: guias de operacao coordenada multi-time
- `pops/`: procedimentos operacionais padrao
- `portfolio/`: matriz de capacidades, catalogo de modelos e agentes do time
- `processos/`: politicas de sessao, mudanca e operacao
- `runbooks/`: diagnostico e mitigacao de incidentes
- `whitepapers/`: material executivo/comercial e documento tecnico

## Documentos de referencia adicionados

- roadmap de midias, seguranca e pentest em `processos/roadmap-midias-seguranca-pentest-assistente-whatsapp.md`
- premissa geral de lucro do ecossistema em `processos/premissa-geral-ecossistema-lucro.md`
- regra de identidade WhatsApp BR, `wa_id` e nono digito em `processos/identidade-whatsapp-br-wa-id.md`
- estrategia de providers do MVP em `processos/provider-strategy-uazapi-primary-baileys-contingency.md`
- processo obrigatorio de correcoes documentadas/comentadas em `processos/mudancas.md`
- processo de equipe completa de resolucao (bugs/dev/infra) em `processos/equipe-resolucao-bugs-dev-infra.md`
- template de registro de correcao em `processos/template-registro-correcao.md`

## Registros operacionais recentes

- incidente SSH da VPS documentado em `runbooks/runbook-incidente-ssh-vps-2026-03-14.md`
- snapshot local de alias/chaves em `ativos/ssh-vps-snapshot-2026-03-14.md`
- revisao assistente WhatsApp em `runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`
- correcoes RUP-2026-007/008/009/010/011/012/013/014/015/016/017/018 em `docs/jornada/correcoes/`

## Principios

1. O assistente nao responde sem comando explicito.
2. Self-chat pode iniciar sessao diretamente; chat externo exige desafio de senha.
3. UAZAPI e o provedor primario; Baileys entra por contingencia.
4. O contexto e da sessao, nao do agente.
5. Troca de skill nao remove agente; remocao de agente e evento distinto.
6. Tudo que impacta producao deve ter telemetria minima, fallback e trilha auditavel.
7. O catalogo de modelos deve ser modular e hot-swappable.
8. O contrato interno da Ruptur deve permanecer acima dos providers.
9. Se o assistente da Ruptur for o dono da conversa, chatbot/AI nativo do provider nao deve competir no mesmo fluxo.
10. Baileys deve ser endurecido desde o MVP, mas sem ser modelado como canal principal antes da hora.

## Agentes do time envolvidos

Pacote operacional recomendado para esta frente:

- `orchestrator`
- `project-planner`
- `debugger`
- `backend-specialist`
- `frontend-specialist`
- `database-architect`
- `documentation-writer`
- `security-auditor`
- `devops-engineer`
- `test-engineer`
- `qa-automation-engineer`
- `code-archaeologist`

Referencia de coordenacao:

- `/.agent/agents/orchestrator.md`
- `/.agent/agents/backend-specialist.md`
- `/.agent/agents/documentation-writer.md`
- `/.agent/agents/security-auditor.md`

## Status

Os artefatos deste diretorio consolidam o MVP alvo. Publicacao em remote, GitHub Projects e producao dependem da etapa operacional e de credenciais/ambiente disponiveis no turno.
