# Modulo CFO 2DL + Pessoal (Diego e Stephanie) — Blueprint

Data: 2026-03-15

## 1) Objetivo do modulo

Criar um modulo CFO como assistente pessoal-operacional para:

- `Pessoal`: vida financeira e agenda de decisoes de Diego e Stephanie.
- `Casal`: metas, compromissos e visao consolidada familiar.
- `Empresa`: 2DL Company LTDA (Diego unico socio), com controle financeiro por unidade/projeto.

Esse modulo deve viver em repositorio proprio e integrar com a farm/ecossistema Ruptur sem acoplamento forte.

## 2) O que ja existe no Ruptur (base aproveitavel)

- API modular com dominios separados (`crm`, `sendflow`, `growth`, `billing`) em [backend/app/main.py](/Users/diego/Downloads/ruptur/backend/app/main.py:45).
- Billing MVP com Asaas e persistencia de checkout/eventos em [backend/app/api/billing.py](/Users/diego/Downloads/ruptur/backend/app/api/billing.py:15).
- Catalogo de planos e precificacao em [backend/app/services/billing_catalog.py](/Users/diego/Downloads/ruptur/backend/app/services/billing_catalog.py:18).
- Base de dados com tabelas de billing, oportunidades e touchpoints em [backend/db/schema.sql](/Users/diego/Downloads/ruptur/backend/db/schema.sql:221).
- Console web modular por rota/menu em [web/src/app/AppShell.tsx](/Users/diego/Downloads/ruptur/web/src/app/AppShell.tsx:13).
- Proxy por host/subdominio para separar experiencias em [web/src/proxy.ts](/Users/diego/Downloads/ruptur/web/src/proxy.ts:3).
- Inventario de ativos (hosts, dominios, providers) em [docs/governanca/ativos/registry.yaml](/Users/diego/Downloads/ruptur/docs/governanca/ativos/registry.yaml:5).

## 3) Lacunas para o modulo CFO

- Nao ha isolamento por contexto (`pessoal`, `casal`, `empresa`, `cliente`, `projeto`) no schema atual.
- Nao ha razao contabil (livro-caixa/ledger) com centros de custo e categorias.
- Nao ha governanca de acesso fina para Diego/Stephanie por escopo de dados.
- Nao ha consolidacao financeira por dominios/projetos/clientes.
- Nao ha assistente com rotinas de fechamento, alertas de caixa e recomendacoes.

## 4) Arquitetura recomendada (repositorio proprio)

Nome sugerido: `cfo-core` (repo separado)

Componentes:

1. `cfo-api` (FastAPI)
- CRUD financeiro, fechamento, previsao de caixa, relatorios, assistente.

2. `cfo-worker`
- ingestao de eventos externos (Ruptur, Asaas, bancos, planilhas) e jobs diarios.

3. `cfo-db` (Postgres)
- modelo financeiro unificado com trilha de auditoria.

4. `cfo-ui` (Next.js opcional)
- cockpit CFO separado do console operacional do Ruptur.

5. `cfo-sdk` (client interno)
- cliente HTTP para integrar com Ruptur/farm sem dependencia de schema interno.

Principio:
- Integrar por API/eventos; evitar leitura direta da base do Ruptur.

## 5) Modelo de dominio (entidades)

### 5.1 Contexto e ownership

- `accounts`: `Pessoal Diego`, `Pessoal Stephanie`, `Casal`, `2DL Company`.
- `workspaces`: area logica por conta para segregacao de dados.
- `memberships`: permissoes por usuario (`owner`, `operator`, `viewer`).

### 5.2 Estrutura empresarial e operacional

- `legal_entities`: 2DL Company LTDA.
- `business_units`: `chips_aquecidos`, `disparos_whatsapp`, `dev_sistemas`, `imob_ai`.
- `projects`: iniciativas internas e clientes (ex.: Attaliba/La Playa, Euller Braz).
- `domains_assets`: `dildas.com.br`, `tiatendeai.com.br`, `ruptur.cloud` etc.

### 5.3 Financeiro

- `chart_of_accounts`: plano de contas.
- `ledger_entries`: lancamentos contabeis/financeiros (partida simples no MVP; dupla depois).
- `cash_accounts`: contas bancarias/carteiras.
- `invoices` e `receivables`: faturamento e recebiveis.
- `payables`: contas a pagar.
- `budgets`: metas por mes/unidade.
- `subscriptions`: custos recorrentes (infra, API, ferramentas, dominios).
- `financial_events`: eventos brutos de integracoes.

### 5.4 Assistente

- `assistant_threads`: conversas do assistente.
- `assistant_tasks`: tarefas e lembretes financeiros.
- `assistant_recommendations`: sugestoes com justificativa e impacto.

## 6) Contrato de integracao com Ruptur

### 6.1 Entradas do CFO vindas do Ruptur

- `billing.checkout.created`
- `billing.checkout.paid`
- `campaign.created`
- `campaign.sent`
- `opportunity.stage_changed`
- `opportunity.won` / `opportunity.lost`

### 6.2 Forma de integracao

MVP:
- Webhook push do Ruptur para `cfo-core` + reprocessamento idempotente por `event_id`.

Evolucao:
- Outbox pattern no Ruptur + fila (Redis/queue) para entrega garantida.

### 6.3 API minima do CFO

- `POST /v1/events/ruptur` (ingestao de eventos)
- `GET /v1/dashboard/cashflow`
- `GET /v1/dashboard/unit-economics`
- `GET /v1/dashboard/projects`
- `POST /v1/assistant/query`
- `POST /v1/close/month`

## 7) Isolamento de acesso (casal + empresa)

Politica recomendada:

- Diego: `owner` em todos os workspaces.
- Stephanie: `owner` em `Casal`; `operator/viewer` no empresarial (conforme decisao).
- Dados empresariais sensiveis (societario/tributario): acesso explicito por role.

Regras tecnicas:

- Toda tabela com `workspace_id`.
- RLS obrigatoria no Postgres.
- Auditoria de leitura/escrita para dados financeiros.

## 8) Integracao com a farm e dominios

- Subdominio sugerido do modulo: `cfo.ruptur.cloud` (ou `finance.ruptur.cloud`).
- Registrar novo ativo no inventario de governanca.
- Publicar no mesmo padrao de deploy (Traefik + healthcheck + runbook).
- Dominios/projetos entram como ativos financeiros vinculados a custos/receitas.

## 9) MVP em 3 fases

## Fase 1 (2 semanas) — Base confiavel

- Criar `cfo-core` com auth basica + workspaces + ledger + dashboard de caixa.
- Integrar eventos de `billing` do Ruptur.
- Cadastro de projetos/unidades/clientes e classificacao de entradas/saidas.

## Fase 2 (2-4 semanas) — Assistente pessoal/CFO

- Assistente com perguntas:
  - "quanto posso gastar esta semana?"
  - "qual projeto mais lucrativo?"
  - "quais contas vencem nos proximos 7 dias?"
- Alertas de runway, inadimplencia e custo variavel acima do limite.

## Fase 3 (4+ semanas) — Planejamento e previsao

- Forecast de caixa por 30/60/90 dias.
- Simulacao de cenario (contratar, aumentar midia, subir servidor, novo projeto).
- Fechamento mensal automatizado com checklist e pendencias.

## 10) Decisoes tecnicas importantes

1. Nao misturar dados pessoais e empresariais sem `workspace_id`.
2. Nao acoplar CFO ao schema interno do Ruptur; integrar por eventos/API.
3. Tratar qualquer sugestao do assistente como recomendacao auditavel (com fonte/calculo).
4. Comecar com fluxo de caixa e margem por projeto antes de BI avancado.

## 11) Riscos e mitigacoes

- Risco: mistura de contexto pessoal e empresa.
  - Mitigacao: segregacao por workspace + RLS + auditoria.
- Risco: evento financeiro duplicado.
  - Mitigacao: idempotencia por `source+event_id`.
- Risco: dependencia de prompts sem base de dados.
  - Mitigacao: assistente sempre responder com dados estruturados + citacao de origem.

## 12) Proximo passo pratico

Abrir o repo `cfo-core` com este esqueleto inicial:

- `apps/api`
- `apps/worker`
- `apps/web` (opcional)
- `packages/sdk`
- `infra/docker-compose.yml`
- `docs/adr/0001-architecture.md`
