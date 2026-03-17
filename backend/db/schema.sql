-- Ruptur (Sprint 0/1): schema mínimo para Inbox/CRM

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'unknown',
  external_id text,
  phone text,
  name text,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_uniq ON leads (phone) WHERE phone IS NOT NULL;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'unknown';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS external_id text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'novo';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS paused boolean NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS conversations_lead_idx ON conversations (lead_id);
CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations (updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  sender text,
  body text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, external_id)
);

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  is_terminal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO pipeline_stages (key, name, position, is_terminal)
VALUES
  ('novo', 'Novo', 10, false),
  ('contato', 'Contato', 20, false),
  ('qualificado', 'Qualificado', 30, false),
  ('desqualificado', 'Desqualificado', 40, true)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_events_lead_idx ON pipeline_events (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'sand',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO crm_labels (key, name, color)
VALUES
  ('vip', 'VIP', 'amber'),
  ('urgente', 'Urgente', 'red'),
  ('proposta', 'Proposta', 'sky'),
  ('retorno', 'Retorno', 'emerald')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS lead_label_links (
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES crm_labels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lead_id, label_id)
);

CREATE INDEX IF NOT EXISTS lead_label_links_label_idx ON lead_label_links (label_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_assignments (
  lead_id uuid PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  owner_name text,
  team text,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_assignments_team_idx ON lead_assignments (team, updated_at DESC);

CREATE TABLE IF NOT EXISTS saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'inbox',
  name text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  position int NOT NULL DEFAULT 0,
  is_shared boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_views_scope_idx ON saved_views (scope, position, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS saved_views_scope_name_uniq ON saved_views (scope, name);

INSERT INTO saved_views (scope, name, definition, position, is_shared)
VALUES
  ('inbox', 'Responder agora', '{"queueFilter":"awaiting_us"}'::jsonb, 10, true),
  ('inbox', 'Sem conversa', '{"queueFilter":"no_conversation"}'::jsonb, 20, true),
  ('inbox', 'Qualificados', '{"statusFilter":"qualificado"}'::jsonb, 30, true)
ON CONFLICT (scope, name) DO NOTHING;

-- Sendflow: fontes (grupos/comunidades/canais) + opt-in (consentimento)
CREATE TABLE IF NOT EXISTS sendflow_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- e.g. whatsapp_group, whatsapp_community, manychat, landing, form
  external_id text, -- id do grupo/comunidade/canal/plataforma
  name text,
  instance_provider text, -- uazapi|baileys (opcional)
  instance_id text, -- id/nome da instância (opcional)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sendflow_sources_provider_idx ON sendflow_sources (provider, external_id);

CREATE TABLE IF NOT EXISTS opt_in_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source_id uuid REFERENCES sendflow_sources(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  consent boolean NOT NULL DEFAULT true,
  proof jsonb, -- evidência (payload do provedor, timestamp, campanha, etc.)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opt_in_events_lead_idx ON opt_in_events (lead_id, created_at DESC);

-- Growth machine: leadscore, hand raise, healthscore de canal, campanhas e roteamento para grupos
CREATE TABLE IF NOT EXISTS lead_scores (
  lead_id uuid PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  score int NOT NULL DEFAULT 0,
  signals jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hand_raise_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'generic',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hand_raise_lead_idx ON hand_raise_events (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS channel_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, -- uazapi|baileys
  instance_id text NOT NULL,
  score int NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'unknown', -- open|connecting|disconnected|unknown
  metrics jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, instance_id)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL, -- one_to_one|group
  provider_preference text NOT NULL DEFAULT 'uazapi', -- uazapi|baileys (auto legado deve resolver para uazapi no MVP)
  payload jsonb NOT NULL, -- template + params (texto, mídia, interativos)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  group_source_id uuid REFERENCES sendflow_sources(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued', -- queued|sent|failed|canceled
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, lead_id, group_source_id)
);

CREATE TABLE IF NOT EXISTS group_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  match jsonb NOT NULL, -- regras (status, tags, score, origem, etc.)
  target_source_id uuid NOT NULL REFERENCES sendflow_sources(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'invite', -- invite|notify_group
  payload jsonb, -- template de mensagem, link, etc.
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Billing (MVP): checkout e eventos (Asaas)
CREATE TABLE IF NOT EXISTS billing_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'asaas',
  external_id text NOT NULL, -- checkout id no provedor
  status text NOT NULL DEFAULT 'active', -- active|paid|canceled|expired|failed
  plan_key text NOT NULL, -- basic|professional|enterprise
  period text NOT NULL, -- annual|quarterly
  attendants int NOT NULL DEFAULT 2,
  amount_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  company_name text,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);

CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'asaas',
  event_type text NOT NULL,
  external_id text,
  payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_events_type_idx ON billing_events (event_type, received_at DESC);

-- Comercial (Receita Previsível): funil e marcos (múltiplos motions)
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  motion text NOT NULL DEFAULT 'sdr_inbound', -- sdr_inbound|bdr_outbound|hybrid|closer|...
  stage text NOT NULL DEFAULT 'prospect', -- ver catálogo abaixo
  title text,
  value_cents int,
  currency text NOT NULL DEFAULT 'BRL',
  owner text, -- usuário responsável (closer/sdr) quando aplicável
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunities_lead_idx ON opportunities (lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunities_stage_idx ON opportunities (stage, updated_at DESC);

-- Estágios recomendados (texto livre no MVP; padronizar depois):
-- prospect -> lead -> oportunidade -> agendamento -> proposta -> contrato -> sinal_pago -> entrega -> ganho|perdido

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'visit', -- visit|call
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled', -- scheduled|done|canceled|no_show
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_opportunity_idx ON appointments (opportunity_id, scheduled_at DESC);

CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft', -- draft|sent|accepted|rejected
  amount_cents int,
  currency text NOT NULL DEFAULT 'BRL',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposals_opportunity_idx ON proposals (opportunity_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft', -- draft|signed|canceled
  signed_at timestamptz,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_opportunity_idx ON contracts (opportunity_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  kind text NOT NULL, -- message|call|visit|note
  direction text, -- in|out quando kind=message
  template_key text,
  outcome text, -- sent|delivered|replied|failed|done|...
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS touchpoints_lead_idx ON touchpoints (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS touchpoints_opportunity_idx ON touchpoints (opportunity_id, created_at DESC);

-- Workflow engine (MVP): esteiras e triggers com cauda longa
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE, -- ex: imob_visita_v1, agencia_call_v1
  name text NOT NULL,
  motion text NOT NULL, -- sdr_inbound|bdr_outbound|closer|...
  channel text NOT NULL DEFAULT 'whatsapp',
  definition jsonb NOT NULL, -- steps/conditions/guards (config-driven)
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb, -- cursor, vars, cooldowns
  status text NOT NULL DEFAULT 'running', -- running|paused|done|canceled
  next_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, lead_id)
);

CREATE INDEX IF NOT EXISTS workflow_runs_due_idx ON workflow_runs (status, next_due_at);

-- CFO (MVP): base financeira para skill de abstracao do Jarvis-CFO
CREATE TABLE IF NOT EXISTS cfo_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  segment text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cfo_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  project_type text NOT NULL DEFAULT 'internal', -- internal|client|product
  status text NOT NULL DEFAULT 'active', -- active|paused|closed
  client_id uuid REFERENCES cfo_clients(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cfo_projects_status_idx ON cfo_projects (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS cfo_projects_client_idx ON cfo_projects (client_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cfo_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname text NOT NULL UNIQUE,
  registrar text,
  annual_cost_cents int NOT NULL DEFAULT 0,
  renews_on date,
  status text NOT NULL DEFAULT 'active', -- active|inactive
  project_id uuid REFERENCES cfo_projects(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cfo_domains_renews_idx ON cfo_domains (renews_on, status);
CREATE INDEX IF NOT EXISTS cfo_domains_project_idx ON cfo_domains (project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cfo_payables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open|paid|canceled
  category text NOT NULL DEFAULT 'operacional',
  project_id uuid REFERENCES cfo_projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES cfo_clients(id) ON DELETE SET NULL,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cfo_payables_due_idx ON cfo_payables (status, due_date);
CREATE INDEX IF NOT EXISTS cfo_payables_project_idx ON cfo_payables (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS cfo_payables_client_idx ON cfo_payables (client_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cfo_receivables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount_cents int NOT NULL CHECK (amount_cents >= 0),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open|received|lost
  category text NOT NULL DEFAULT 'receita',
  project_id uuid REFERENCES cfo_projects(id) ON DELETE SET NULL,
  client_id uuid REFERENCES cfo_clients(id) ON DELETE SET NULL,
  received_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cfo_receivables_due_idx ON cfo_receivables (status, due_date);
CREATE INDEX IF NOT EXISTS cfo_receivables_project_idx ON cfo_receivables (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS cfo_receivables_client_idx ON cfo_receivables (client_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS cfo_weekly_close_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_date date NOT NULL,
  checklist jsonb NOT NULL,
  summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cfo_weekly_close_ref_idx ON cfo_weekly_close_runs (reference_date DESC, created_at DESC);

-- Jarvis Ops (skill eggs): missões executivas e notícias de entrega
CREATE TABLE IF NOT EXISTS jarvis_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  demand text NOT NULL,
  status text NOT NULL DEFAULT 'planned', -- planned|in_progress|blocked|done|canceled
  priority text NOT NULL DEFAULT 'p2', -- p0|p1|p2|p3
  owner text,
  team text,
  source text NOT NULL DEFAULT 'diego',
  acceptance_criteria text,
  due_date date,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jarvis_missions_status_idx ON jarvis_missions (status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS jarvis_missions_due_idx ON jarvis_missions (due_date, status);

CREATE TABLE IF NOT EXISTS jarvis_mission_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES jarvis_missions(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'note', -- note|delivery|risk|blocker
  message text NOT NULL,
  created_by text NOT NULL DEFAULT 'jarvis',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jarvis_mission_updates_mission_idx ON jarvis_mission_updates (mission_id, created_at DESC);
