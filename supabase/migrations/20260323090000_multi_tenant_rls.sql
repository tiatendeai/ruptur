-- Migration B1: Multi-tenant & Row Level Security (RLS)
-- Criação das tabelas base de multi-tenant e aplicação de RLS no CRM

-- 1. Criação das tabelas de Tenants e Usuários de Tenants
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- Referência lógica a auth.users(id) do Supabase Auth
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, user_id)
);

-- 2. Adicição da coluna tenant_id nas tabelas existentes do CRM
DO $$ 
DECLARE
  t text;
  tables text[] := ARRAY[
    'leads', 'conversations', 'messages', 'pipeline_stages', 'pipeline_events', 
    'sendflow_sources', 'opt_in_events', 'lead_scores', 'hand_raise_events', 
    'channel_health', 'campaigns', 'campaign_targets', 'group_routing_rules', 
    'billing_checkouts', 'billing_events', 'opportunities', 'appointments', 
    'proposals', 'contracts', 'touchpoints', 'workflows', 'workflow_runs'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;', t);
  END LOOP;
END $$;

-- 3. Habilitação do Row Level Security (RLS)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE
  t text;
  tables text[] := ARRAY[
    'leads', 'conversations', 'messages', 'pipeline_stages', 'pipeline_events', 
    'sendflow_sources', 'opt_in_events', 'lead_scores', 'hand_raise_events', 
    'channel_health', 'campaigns', 'campaign_targets', 'group_routing_rules', 
    'billing_checkouts', 'billing_events', 'opportunities', 'appointments', 
    'proposals', 'contracts', 'touchpoints', 'workflows', 'workflow_runs'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- 4. Função auxiliar para obter os IDs dos tenants do usuário logado
CREATE OR REPLACE FUNCTION get_user_tenant_ids() 
RETURNS SETOF uuid AS $$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Aplicação das Políticas RLS
-- Para Tenants
CREATE POLICY "Users can view their tenants" ON tenants
  FOR SELECT USING (id IN (SELECT get_user_tenant_ids()));

-- Para Tenant Users
CREATE POLICY "Users can view users in their tenants" ON tenant_users
  FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()));

-- Para todas as outras tabelas do CRM
DO $$ 
DECLARE
  t text;
  tables text[] := ARRAY[
    'leads', 'conversations', 'messages', 'pipeline_stages', 'pipeline_events', 
    'sendflow_sources', 'opt_in_events', 'lead_scores', 'hand_raise_events', 
    'channel_health', 'campaigns', 'campaign_targets', 'group_routing_rules', 
    'billing_checkouts', 'billing_events', 'opportunities', 'appointments', 
    'proposals', 'contracts', 'touchpoints', 'workflows', 'workflow_runs'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format(
      'CREATE POLICY "Tenant isolation for %I" ON %I FOR ALL USING (tenant_id IN (SELECT get_user_tenant_ids())) WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()));',
      t, t
    );
  END LOOP;
END $$;
