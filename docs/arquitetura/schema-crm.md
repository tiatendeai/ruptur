# Arquitetura de Dados do CRM (Supabase)

Esta documentação descreve as principais tabelas e o modelo Multi-Tenant implementado na Fase B1.

## Multi-Tenant e RLS

Todo o isolamento de dados é garantido diretamente no banco via Postgres **Row Level Security (RLS)**.

- **`tenants`**: A entidade raiz que agrupa usuários e recursos de uma conta/organização.
- **`tenant_users`**: Tabela associativa entre `tenants` e `auth.users` do Supabase. Define se o usuário tem permissão (ex: role `member` ou `admin`) para acessar os dados daquele tenant.

Uma função SQL `get_user_tenant_ids()` assegura que qualquer instrução `SELECT`, `UPDATE`, `INSERT` ou `DELETE` no banco sempre filtre o `tenant_id` atrelado aos IDs do usuário logado (`auth.uid()`).

## Principais Tabelas de Domínio

- **`leads`**: Centraliza os contatos. Tem telefone único não-nulo, nome e status geral (novo).
- **`conversations` & `messages`**: Agrupa histórico de mensagens com canais (WhatsApp, etc).
- **`pipeline_stages`**: Kanban steps (ex: Novo, Contato, Qualificado). Ordenáveis via `position`.
- **`pipeline_events`**: Audit e log de transições de um lead no CRM.
- **`opportunities`**: Oportunidades financeiras ligadas a um lead e a um motion (ex: sdr_inbound).
- **`campaigns` & `campaign_targets`**: Regras de broadcast e distribuição em massa para leads.
- **`workflows` & `workflow_runs`**: Gatilhos e sequências lógicas (Fase C) atrelados a fluxos de comunicação.

Todas as tabelas de domínio acima possuem a restrição `tenant_id` vinculada em cascata (DELETE CASCADE) ao `tenants`.

## Aplicação ao Código

Sempre que a API (FastAPI) operar no banco, ela deve assumir o escopo do usuário via JWT do Supabase Authenticated, ativando automaticamente a camada de RLS.
