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

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel text NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, external_id)
);

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
  provider_preference text NOT NULL DEFAULT 'auto', -- auto|uazapi|baileys
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
