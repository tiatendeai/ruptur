# PLAN — CRM + Dashboard + Disparos WhatsApp (Ruptur)

Data: 2026-03-12  
Branch alvo: `work`  

## 0) Objetivo

Construir a camada **Dashboard + CRM + Operação de WhatsApp** do Ruptur, com foco em:

- **Inbox** (bate‑papo ao vivo / timeline)
- **CRM Kanban** (pipeline por estágios)
- **Disparos** (broadcast/campanhas) com warmup/delay
- **Conexões** (multi‑instâncias UAZAPI nativas + Baileys contingência)
- **Templates/treinamento** (base de conhecimento e playbooks)
- **Governança** (POPs, runbooks, assets portfolio) para replicação

Diretriz do projeto: **usar o que já existe (UAZAPI) e apenas orquestrar gaps**. Baileys é contingência/expansão.

## 1) Contexto & restrições

### 1.1 “Idêntico ao Front Zap”

Requisito de *“idêntico e fidedigno”* (UI/fluxos) é **risco de copyright/branding**.

Plano assume:

- Vamos entregar **paridade funcional** (mesmas “capabilities”), mas com **marca e UI próprias** do Ruptur.
- O diretório `0WbsZjA4yKfY.br/` parece ser um export de site WordPress/Elementor (landing). Ele pode ser usado como **referência** ou como “base de landing” **somente se** o time tiver direito de uso.

Checkpoint: confirmar **direito de uso** do conteúdo/ativos antes de publicar.

### 1.2 Multi‑tenant (obrigatório)

O Ruptur precisa suportar muitos chips/instâncias.

- UAZAPI: usar **controle nativo** (listar/criar/conectar/status) via admin token.
- Baileys: manter camada multi‑instância existente, apenas estender para suportar features necessárias.

### 1.3 Dados sensíveis

Chaves/token devem ficar em `.env` / secrets manager (nunca em git).

## 2) Escopo (MVP e depois)

### 2.1 MVP (entrega 1)

**Conexões**
- Tela para listar instâncias UAZAPI (status + número) e abrir QR quando `connecting`.
- Tela para listar instâncias Baileys e conectar por QR quando necessário.

**Inbox**
- Lista de conversas + timeline de mensagens por contato (paginado).
- Ações rápidas: responder (texto/mídia), marcar “próximo passo”, mover estágio.

**CRM Kanban**
- Quadro por estágios configuráveis.
- Cards de lead com: nome, telefone, último contato, estágio, tags.
- Drag & drop para mover estágio (gera evento).

**Disparos (básico)**
- Criar campanha com template (texto/URL).
- Selecionar audiência (tags/estágio) e enviar com delay.
- Para UAZAPI: preferir delay/warmup **nativo** (se disponível).
- Para Baileys: usar fila/delay já existente (bulk worker).

### 2.2 Próximas entregas (entrega 2+)

- Automação de follow‑up (jobs) + métricas.
- Catálogo/listas interativas (menus) e quick replies como playbook.
- Extração de contatos de grupos (*avaliar compliance e termos*).
- Relatórios: taxa de resposta, funil por estágio, SLA.
- “Treinamento” do agente: editor de prompt/playbook + versões.

## 3) Arquitetura (alto nível)

### 3.1 Componentes

- **Frontend Web (Dashboard)**: app web (recomendado: Next.js) com autenticação e UI do CRM.
- **Ruptur Backend (FastAPI)**: API de orquestração (UAZAPI/Baileys) + endpoints do CRM.
- **Supabase (Postgres + Auth + Storage)**: dados multi‑tenant, RLS, storage de mídia/arquivos.
- **UAZAPI (primário)**: envio, instâncias, webhooks.
- **Baileys (contingência)**: envio, interativos, transcrição (Whisper local).

### 3.2 Modelo multi‑tenant (proposta)

Tabelas com `tenant_id` e RLS no Supabase.

- `tenants`
- `tenant_users` (papéis)
- `wa_instances` (provider=uazapi|baileys, instance_id, status, phone)
- `contacts` (leads)
- `conversations`
- `messages`
- `pipeline_stages`
- `pipeline_events`
- `broadcasts`
- `broadcast_recipients`
- `tags` + `contact_tags`

## 4) UX/IA (mapa do produto)

Menu principal (v1):

- **Inbox**
- **Pipeline**
- **Disparos**
- **Conexões**
- **Templates**
- **Configurações** (estágios, tags, usuários)

## 5) Plano de execução (tarefas verificáveis)

### Fase A — Descoberta + spec

**A1. Auditoria do conteúdo “front”**
- INPUT: `0WbsZjA4yKfY.br/`
- OUTPUT: inventário (landing vs app), lista de assets reutilizáveis, riscos de licenciamento
- VERIFY: doc `docs/research/frontzap-ui-inventory.md`

**A2. Definição de paridade funcional**
- INPUT: vídeo + notas do time
- OUTPUT: checklist “capabilities parity” (Inbox/CRM/Disparos/Conexões)
- VERIFY: doc `docs/research/capabilities-parity.md`

### Fase B — Dados (Supabase)

**B1. Esquema e RLS multi‑tenant**
- OUTPUT: migrations SQL + policies RLS
- VERIFY: `supabase db diff` (ou SQL aplicado) + testes simples de acesso

### Fase C — Backend (FastAPI)

**C1. CRUD CRM**
- Endpoints: contacts, conversations, messages, stages, pipeline events
- VERIFY: `curl` + testes unitários mínimos

**C2. Webhook ingest**
- UAZAPI webhook → persistir `message`, atualizar `conversation`, `contact.last_seen`
- Baileys events → persistir via webhook interno
- VERIFY: mensagem real entra no Inbox

### Fase D — Frontend (Dashboard)

**D1. Setup do app**
- Next.js + Tailwind + componente UI
- Auth via Supabase (login, sessão)
- VERIFY: login/logout funcionando

**D2. Inbox**
- Lista de conversas + timeline + responder
- VERIFY: envia/recebe e atualiza UI

**D3. Kanban**
- Estágios + drag‑drop + persistência
- VERIFY: mover card gera evento e reflete no banco

**D4. Disparos**
- Criar campanha + preview + fila
- VERIFY: envio controlado e logging do resultado

### Fase E — Integrações (UAZAPI/Baileys)

**E1. Conexões UAZAPI (nativo)**
- Listar instâncias, status, QR connect
- VERIFY: conectar novo chip via dashboard

**E2. Conexões Baileys**
- Listar instâncias + QR
- VERIFY: conectar e enviar interativos

### Fase F — Governança (replicação)

**F1. POPs e runbooks**
- POP: “Conectar instância”, “Disparos com warmup”, “Interativos (botões/lista)”
- VERIFY: docs em `docs/governanca/pops/` e `docs/governanca/runbooks/`

## 6) Agentes do kit (.agent) e responsabilidades

- `project-planner`: manter este plano e milestones
- `frontend-specialist`: Dashboard (Inbox/Kanban/Disparos)
- `backend-specialist`: FastAPI + integrações
- `database-architect`: esquema Supabase + RLS
- `devops-engineer`: deploy Traefik/VPS + rotas
- `security-auditor`: segredos, RLS, permissões, auditoria de logs
- `test-engineer`: smoke tests e checks
- `documentation-writer`: POPs e guias de operação

## 7) Checkpoints de aprovação (antes de codar pesado)

1. **Direito de uso** do conteúdo/ativos do `0WbsZjA4yKfY.br/` (sim/não).
2. **Stack do frontend**: Next.js (recomendado) vs manter estático + API (não recomendado para dashboard).
3. **MVP exato**: quais telas primeiro (Inbox vs Kanban vs Conexões).

