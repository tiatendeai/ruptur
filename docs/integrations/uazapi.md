# Integração: uazapiGO (WhatsApp API)

Este documento resume a especificação OpenAPI em `docs/jornada/uazapi-openapi-spec.yaml` e traduz para o que o Ruptur precisa implementar.

## Por que isso importa para o Ruptur

O Ruptur (Fase 1) depende de 2 capacidades:

1) **receber eventos** (mensagens/atualizações/conexão) em tempo real;
2) **enviar mensagens** e controlar estado (marcar como lida, etc).

A uazapiGO oferece isso via **webhook**, **SSE** e endpoints de **send/message/chat/instance**.

## Autenticação (ponto crítico)

- Endpoints “normais”: header `token` (token da instância).
- Endpoints administrativos: header `admintoken`.
- `GET /sse`: usa `token` como query param (conforme spec).

No Ruptur, esse token deve ser tratado como segredo (env/secret store), e associado a uma “instância” interna.

## Endpoints essenciais (para o MVP do Ruptur)

### 1) Instância (conectar e observar estado)

- `POST /instance/init` (admin): cria instância e retorna `token`.
- `POST /instance/connect`: inicia pareamento/conexão.
- `POST /instance/disconnect`: desconecta.
- `GET /instance/status`: status (`disconnected|connecting|connected`) e detalhes (QR/paircode etc).
- `POST /instance/updatechatbotsettings`: importante para **desativar chatbot embutido** se o Ruptur for o orquestrador.

### 2) Receber eventos

Opção A (recomendado para backend): `POST /webhook`
- configurar URL do Ruptur (ex.: `https://api.seudominio.com/webhook/uazapi`)
- usar `events` com pelo menos: `messages`, `messages_update`, `connection`
- usar `excludeMessages: ["wasSentByApi"]` para evitar loop quando o Ruptur enviar mensagens via API

Opção B (útil para ferramentas internas): `GET /sse`
- mantém stream de eventos (bom para debugging/observabilidade)

### 3) Enviar mensagens e operar conversa

- `POST /send/text`: resposta principal do Ruptur.
- `POST /send/media`: anexos (documentos/áudio etc).
- `POST /message/markread`: manter estado de leitura coerente (se fizer sentido no fluxo).
- `POST /message/edit` / `delete` / `react`: opcionais, mas úteis para correções e UX.

## Eventos de webhook (o que escutar)

Lista disponível (conforme schema do webhook): `connection`, `history`, `messages`, `messages_update`, `call`, `contacts`, `presence`, `groups`, `labels`, `chats`, `chat_labels`, `blocks`, `leads`.

Para o Ruptur Fase 1, o mínimo recomendado:

- `messages`: entrada de lead + captura de conversa
- `messages_update`: atualizações (ex.: status/ack/edições)
- `connection`: saber quando a instância caiu

## Mapeamento para o schema do Ruptur (Postgres local)

Usar o schema em `backend/db/schema.sql`:

- `leads`: upsert por `phone` (quando for conversa 1:1) ou por identificador externo quando disponível.
- `conversations`: `channel='whatsapp'` + `external_id` = `chatid`/`wa_chatid` (quando presente no payload).
- `messages`:
  - `external_id` = id da mensagem no payload (idempotência)
  - `direction` = `in` para mensagens recebidas; `out` para enviadas via Ruptur
  - `raw` = payload completo (auditoria)

## O que o Ruptur vai precisar implementar (Sprint 1)

- Endpoint `POST /webhook/uazapi` (recebe eventos e persiste idempotente).
- Normalização de `chatid`/`number` → `lead`/`conversation`.
- Envio de respostas via `POST /send/text`.
- Proteção anti-loop usando `excludeMessages: ["wasSentByApi"]` + checagem defensiva no Ruptur.
