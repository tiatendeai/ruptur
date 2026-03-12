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
- **Agentes de IA (SDR)** (qualificação, follow-up, handoff humano)
- **Construtor de fluxo** (orquestração de automações)
- **Enriquecimento de leads** (fontes externas + dados nacionais)
- **Web scraping / MCP / A2A** (capabilities adicionais via ferramentas)
- **Governança** (POPs, runbooks, assets portfolio) para replicação
- **Receita Previsível na prática**: motions SDR/BDR/híbrido, inbound+outbound, remarketing, ativação e reativação

Diretriz do projeto: **usar o que já existe (UAZAPI) e apenas orquestrar gaps**. Baileys é contingência/expansão.

## 1) Contexto & restrições

### 1.1 Referências externas (UI/branding)

Diretriz: implementar **em nossos termos** (Ruptur), evitando dependência de stacks/temas externos (ex.: WordPress/Elementor) e qualquer acoplamento a marca/identidade de terceiros.

Checkpoint: garantir que **todo o UI/UX** e o conteúdo publicado são do Ruptur (ou devidamente licenciados).

### 1.2 Multi‑tenant (obrigatório)

O Ruptur precisa suportar muitos chips/instâncias.

- UAZAPI: usar **controle nativo** (listar/criar/conectar/status) via admin token.
- Baileys: manter camada multi‑instância existente, apenas estender para suportar features necessárias.

### 1.3 Dados sensíveis

Chaves/token devem ficar em `.env` / secrets manager (nunca em git).

### 1.4 Não engessar o modelo (SDR/BDR/híbrido)

No dia a dia, inbound e outbound coexistem. O Ruptur deve suportar:

- **Inbound SDR** (responder leads que chegaram)
- **Outbound BDR** (prospectar e reativar)
- **Híbrido** (mesma equipe/instância alternando motions)

Estratégia: modelar “motion” como **configuração**, não como código fixo.

### 1.5 Multi‑canal (futuro)

WhatsApp é o foco, mas o core deve aceitar outros canais (email, Instagram, webchat) sem reescrever CRM.

Estratégia: eventos e conversas com `channel` e “provider adapters”.

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
- Controle de grupos (metadados, moderação, segmentação) (*avaliar compliance e termos*).
- Extração de contatos de grupos (*alto risco de compliance/termos; só com decisão explícita*).
- Relatórios: taxa de resposta, funil por estágio, SLA.
- “Treinamento” do agente: editor de prompt/playbook + versões.
- Construtor de fluxo (visual ou YAML) para SDR/marketing/CS.
- Enriquecimento de leads (Lusha/Apollo-like + provedores nacionais) com cache e auditoria.
- Web scraper service (Playwright) como ferramenta opcional via MCP + filas.
- Webhooks + remarketing + reativação (gatilhos por evento/tempo).
- “Motions” configuráveis (SDR inbound, BDR outbound, reativação, pós-venda).

## 3) Arquitetura (alto nível)

### 3.1 Componentes

- **Frontend Web (Dashboard)**: app web (recomendado: Next.js) com autenticação e UI do CRM.
- **Ruptur Backend (FastAPI)**: API de orquestração (UAZAPI/Baileys) + endpoints do CRM.
- **Supabase (Postgres + Auth + Storage)**: dados multi‑tenant, RLS, storage de mídia/arquivos.
- **UAZAPI (primário)**: envio, instâncias, webhooks.
- **Baileys (contingência)**: envio, interativos, transcrição (Whisper local).
- **Agent Runtime (SDR)**: execução de agentes (tools, memória, policies, avaliação) — inicialmente no backend.
- **Flow Runtime**: engine de fluxos (gatilhos → ações) com fila e idempotência.
- **Enrichment Connectors**: provedores externos (B2B e dados nacionais) com rate-limit/cache.
- **Scraper/MCP Tools**: serviços opcionais (scraping, search, browser) chamados via A2A/MCP.
- **Webhook Router**: camada unificada para receber webhooks multicanal e normalizar em eventos internos.
- **Queue/Workers**: execução de cadências, reativação, enrichment e scraping (Redis opcional).

### 3.3 Event model (C‑ready)

Mesmo em A (backend-first), tratar o sistema como “event-friendly”:

- `message_in`, `message_out`
- `lead_created`, `lead_updated`
- `stage_changed`
- `opt_in_received`, `opt_out_received`
- `campaign_enqueued`, `campaign_sent`, `campaign_failed`
- `hand_raise` (levantada de mão)
- `channel_health_updated`

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
- `agent_profiles` (persona, prompt, policies)
- `agent_runs` (trace, input/output, custos)
- `flows` (definição)
- `flow_runs` (execuções)
- `enrichment_jobs` (requests, status, fonte, auditoria)
- `enrichment_cache` (resultado normalizado + TTL)

## 4) UX/IA (mapa do produto)

Menu principal (v1):

- **Inbox**
- **Pipeline**
- **Disparos**
- **Conexões**
- **Templates**
- **Agentes**
- **Fluxos**
- **Grupos**
- **Sendflow** (grupos/comunidades + opt-in + conectores tipo ManyChat)
- **Configurações** (estágios, tags, usuários)
- **Webhooks** (integrações e saúde)

## 5) Plano de execução (tarefas verificáveis)

### Fase A — Descoberta + spec

**A1. Auditoria do conteúdo “front”**
- INPUT: qualquer material de referência interno (screenshots, fluxos, copy)
- OUTPUT: inventário (landing vs app), lista de assets reutilizáveis, riscos de licenciamento
- VERIFY: doc `docs/research/frontzap-ui-inventory.md`

**A2. Definição de paridade funcional**
- INPUT: vídeo + notas do time
- OUTPUT: checklist “capabilities parity” (Inbox/CRM/Disparos/Conexões)
- VERIFY: doc `docs/research/capabilities-parity.md`

**A3. SDR + Growth Machine (escopo e cadência)**
- INPUT: objetivos comerciais (SDR/closer, segmentos, oferta)
- OUTPUT: playbooks (cadências, objeções, handoff, SLA) + métricas
- VERIFY: doc `docs/jornada/sdr-growth-machine.md`

**A4. Compliance (LGPD/WhatsApp)**
- INPUT: canais e estratégia (inbound/outbound), consentimento
- OUTPUT: checklist de compliance + políticas (opt-out, limites, auditoria)
- VERIFY: doc `docs/governanca/processos/compliance-whatsapp-lgpd.md`

**A5. Sendflow (grupos/comunidades + opt-in)**
- INPUT: canais (grupos/comunidades, ManyChat, formulários, landing)
- OUTPUT: modelo de dados e fluxo “lead com consentimento” (origem, prova, opt-out)
- VERIFY: doc `docs/research/sendflow-spec.md`

**A6. Motions Receita Previsível**
- INPUT: segmento(s), ICP, oferta, regras de opt-in, limites por chip
- OUTPUT: catálogo de motions (inbound SDR, outbound BDR, reativação, remarketing) + KPIs
- VERIFY: doc `docs/jornada/receita-previsivel-motions.md`

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

**C3. Agent Runtime (SDR)**
- OUTPUT: modelos `agent_profiles` + endpoint para executar “next best action”
- VERIFY: dado um lead + contexto, retornar sugestão e/ou ação de envio

**C4. Flow Runtime**
- OUTPUT: engine simples (gatilhos → ações) + execuções idempotentes
- VERIFY: fluxo “sem resposta em X horas” dispara follow-up

**C5. Enrichment**
- OUTPUT: interfaces de conectores + fila + cache + auditoria
- VERIFY: lead com telefone/email gera enriquecimento e atualiza campos

**C6. Sendflow**
- OUTPUT: entidades `sendflow_sources` + `opt_in_events` + endpoints (listar, registrar opt-in, tags)
- VERIFY: import de lead via webhook ManyChat (opt-in) aparece no Inbox/CRM

**C7. Webhook Router (multi-canal)**
- OUTPUT: endpoint(s) genéricos para receber webhooks (com assinatura/secret), normalizar e persistir
- VERIFY: registrar 2 provedores (ex.: UAZAPI + ManyChat) e ver eventos entrando

**C8. Remarketing / ativação / reativação**
- OUTPUT: scheduler/worker para cadências por tempo (sem resposta em X, reativar em Y dias, etc.)
- VERIFY: regras configuráveis disparam e geram `campaign_targets`

**C9. Billing (Asaas)**
- OUTPUT: catálogo de planos (seat-based), checkout interno, webhook de pagamento
- VERIFY: criar checkout no console e receber `CHECKOUT_PAID` atualizando status e liberando recursos

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

**D5. Agentes**
- UI para criar/editar “perfil de SDR” (persona, tom, regras, objetivos)
- VERIFY: preview + execução manual em um lead

**D6. Fluxos**
- UI (MVP) para criar fluxo por templates (gatilhos e ações)
- VERIFY: ativar/desativar e ver histórico

**D7. Enrichment**
- UI para ver “dados enriquecidos”, fonte, confiança e histórico
- VERIFY: executar enrichment em lead e ver campos atualizados

**D8. Sendflow**
- UI para: fontes (grupos/comunidades/canais), entradas opt-in, status de sincronização
- VERIFY: lead importado aparece e fica rastreável (origem/consentimento)

### Fase E — Integrações (UAZAPI/Baileys)

**E1. Conexões UAZAPI (nativo)**
- Listar instâncias, status, QR connect
- VERIFY: conectar novo chip via dashboard

**E2. Conexões Baileys**
- Listar instâncias + QR
- VERIFY: conectar e enviar interativos

**E3. Grupos**
- OUTPUT: leitura de metadados de grupos + segmentação (quando permitido)
- VERIFY: listar grupos associados à instância e tags (sem extração massiva)

### Fase F — Governança (replicação)

**F1. POPs e runbooks**
- POP: “Conectar instância”, “Disparos com warmup”, “Interativos (botões/lista)”
- POP: “Motions SDR/BDR”, “Opt-in/Opt-out”, “Remarketing/Reativação”, “Webhooks”
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

1. **Licenciamento**: garantir que UI/copy/ativos publicados são do Ruptur (ou licenciados).
2. **Stack do frontend**: Next.js (recomendado) vs manter estático + API (não recomendado para dashboard).
3. **MVP exato**: quais telas primeiro (Inbox vs Kanban vs Conexões).
4. **Outbound vs Inbound**: política de consentimento e limites por chip.
5. **Enrichment providers**: quais conectores (B2B + nacional) entram primeiro.
6. **Scraping**: permitido? (fontes, escopo, throttling, auditoria).
7. **Infra alvo**: Vercel (web), Render (workers/cron) vs VPS (Swarm) vs híbrido.
8. **Redis**: usar (Upstash/Redis Cloud) para filas e rate-limit ou manter fila no Postgres no MVP.
