-- Ruptur (Sprint 0) - Schema inicial
-- Objetivo: suportar ingestão de mensagens, memória de conversa, qualificação e pipeline mínimo.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  source text,
  external_id text,
  phone text,
  name text,

  status text NOT NULL DEFAULT 'novo'
);

CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_unique
  ON leads (phone)
  WHERE phone IS NOT NULL AND phone <> '';

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  lead_id uuid NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'whatsapp',
  external_id text
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_channel_external_unique
  ON conversations (channel, external_id)
  WHERE external_id IS NOT NULL AND external_id <> '';

CREATE INDEX IF NOT EXISTS conversations_lead_id_idx
  ON conversations (lead_id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  external_id text,
  direction text NOT NULL CHECK (direction IN ('in', 'out')),
  sender text,
  body text,
  raw jsonb
);

-- Idempotência por message_id/externo (quando existir)
CREATE UNIQUE INDEX IF NOT EXISTS messages_external_unique
  ON messages (conversation_id, external_id)
  WHERE external_id IS NOT NULL AND external_id <> '';

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS pipeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  lead_id uuid NOT NULL REFERENCES leads (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb
);

CREATE INDEX IF NOT EXISTS pipeline_events_lead_created_idx
  ON pipeline_events (lead_id, created_at DESC);

COMMIT;
