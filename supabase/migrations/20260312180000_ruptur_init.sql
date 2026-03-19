-- Ruptur: initial schema (generated from backend/db/schema.sql)

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

CREATE TABLE IF NOT EXISTS sendflow_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_id text,
  name text,
  instance_provider text,
  instance_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sendflow_sources_provider_idx ON sendflow_sources (provider, external_id);

CREATE TABLE IF NOT EXISTS opt_in_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  source_id uuid REFERENCES sendflow_sources(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  consent boolean NOT NULL DEFAULT true,
  proof jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opt_in_events_lead_idx ON opt_in_events (lead_id, created_at DESC);

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
  provider text NOT NULL,
  instance_id text NOT NULL,
  score int NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'unknown',
  metrics jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, instance_id)
);

CREATE TABLE IF NOT EXISTS campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  provider_preference text NOT NULL DEFAULT 'auto',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  group_source_id uuid REFERENCES sendflow_sources(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'queued',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, lead_id, group_source_id)
);

CREATE TABLE IF NOT EXISTS group_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  match jsonb NOT NULL,
  target_source_id uuid NOT NULL REFERENCES sendflow_sources(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'invite',
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS billing_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'asaas',
  external_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  plan_key text NOT NULL,
  period text NOT NULL,
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

CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  motion text NOT NULL DEFAULT 'sdr_inbound',
  stage text NOT NULL DEFAULT 'prospect',
  title text,
  value_cents int,
  currency text NOT NULL DEFAULT 'BRL',
  owner text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS opportunities_lead_idx ON opportunities (lead_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS opportunities_stage_idx ON opportunities (stage, updated_at DESC);

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'visit',
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS appointments_opportunity_idx ON appointments (opportunity_id, scheduled_at DESC);

CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft',
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
  status text NOT NULL DEFAULT 'draft',
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
  kind text NOT NULL,
  direction text,
  template_key text,
  outcome text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS touchpoints_lead_idx ON touchpoints (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS touchpoints_opportunity_idx ON touchpoints (opportunity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  motion text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  definition jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'running',
  next_due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, lead_id)
);

CREATE INDEX IF NOT EXISTS workflow_runs_due_idx ON workflow_runs (status, next_due_at);

