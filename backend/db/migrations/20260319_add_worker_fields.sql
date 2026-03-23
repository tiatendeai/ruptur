-- Migração: Suporte a Worker Assíncrono e Outbox Pattern
-- Adiciona campos de controle para processamento de IA e status de envio de mensagens.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS ai_status text DEFAULT 'na' CHECK (ai_status IN ('na', 'pending', 'processing', 'done', 'error'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS outbox_status text DEFAULT 'na' CHECK (outbox_status IN ('na', 'queued', 'sent', 'failed'));

-- Índice para busca rápida de jobs pendentes (Performance/DevOps)
CREATE INDEX IF NOT EXISTS idx_messages_ai_pending ON messages (ai_status) WHERE ai_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_messages_outbox_queue ON messages (outbox_status) WHERE outbox_status = 'queued';

COMMENT ON COLUMN messages.ai_status IS 'Status do processamento da IAzinha/Jarvis para esta mensagem.';
COMMENT ON COLUMN messages.outbox_status IS 'Status do despacho da mensagem para o provedor externo (UAZAPI/Baileys).';
