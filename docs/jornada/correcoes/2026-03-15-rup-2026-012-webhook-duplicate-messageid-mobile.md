# RUP-2026-012 — Webhook duplicado por `messageid` (Mac/iPhone)

- `id`: RUP-2026-012
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: backend | devops
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Sintoma reportado: comando `Iazinha` acionava via WhatsApp Web, mas falhava no WhatsApp Mac/iPhone, nos dois numeros.

## 2) Causa raiz

Eventos do mesmo `messageid` chegavam em duplicidade no webhook. Em parte dos casos (Mac/iPhone), o primeiro evento vinha sem `text` e era persistido. O segundo evento (com `text`) era descartado por `ON CONFLICT DO NOTHING`, deixando `result.message_id=None` e bloqueando o gatilho do assistente.

## 3) Correcao aplicada

- Arquivo: `backend/app/services/uazapi_ingest.py`
  - `INSERT ... ON CONFLICT` alterado para `DO UPDATE` condicional:
    - atualiza somente quando o registro existente ainda nao tem `body`
    - aceita o evento enriquecido com texto e retorna `message_id`
- Arquivo: `backend/app/services/wa_identity.py`
  - reforco de normalizacao para self-chat `@lid` com variacao de `sender` em clientes companion
- Arquivo: `backend/app/api/uazapi_webhook.py`
  - reforco de `is_self_chat` para `@lid`
  - telemetria expandida no log de trigger com `has_body` e `message_id`

## 4) Comentarios tecnicos relevantes

- Comentario no codigo em `wa_identity.py` sobre comportamento de clientes companion para `@lid`.
- Telemetria de trigger enriquecida para diagnostico de falso negativo no acionamento.

## 5) Validacao

- Deploy em producao no `host2-ruptur-backend-1` com rebuild.
- Teste sintetico do mesmo `messageid`:
  - evento 1 (`text=null`) -> `message_id` retornado
  - evento 2 (mesmo `messageid`, `text` preenchido) -> mesmo `message_id` retornado (enriquecimento aplicado)
- Teste sintetico `@lid + fromMe=true + text=Iazinha` para:
  - `inst-553189131980`
  - `inst-553181139540`
- Evidencia em log:
  - `explicit=True`, `self_chat=True`, `has_body=True`, `message_id=True`, `should_respond=True`
  - resposta enviada em ambas instancias.

## 6) Impacto lateralizado

- Backend passa a aceitar enriquecimento tardio da mensagem sem quebrar anti-loop.
- Observabilidade melhor para suporte N1/N2 em falha de acionamento.

## 7) Risco residual

- Se a ordem de eventos variar com payload inconsistente (sem `text` em todos), o gatilho segue bloqueado por desenho.
- Dependencia da conectividade das instancias Baileys para resposta final.

## 8) Rollback

1. Restaurar versao anterior dos arquivos:
   - `backend/app/services/uazapi_ingest.py`
   - `backend/app/services/wa_identity.py`
   - `backend/app/api/uazapi_webhook.py`
2. Rebuild:
   - `cd ~/apps/ruptur-backend/deploy/host2 && docker compose up -d --build ruptur-backend`
3. Verificar `https://api.ruptur.cloud/health`.

## 9) Links

- card GitHub Project: pendente
- PR/commit: patch direto em VPS (hotfix operacional)
- runbook/doc atualizada: `docs/jornada/correcoes/README.md`
