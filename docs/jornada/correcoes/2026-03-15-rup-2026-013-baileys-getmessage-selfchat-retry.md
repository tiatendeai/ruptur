# RUP-2026-013 — Baileys `getMessage` ausente em self-chat companion

- `id`: RUP-2026-013
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: backend | devops | sustentacao
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: em_validacao

## 1) Contexto

Self-chat em WhatsApp Web funcionava, mas em iPhone/Mac apareciam placeholders do tipo `Aguardando mensagem. Essa acao pode levar alguns instantes.` ou respostas inconsistentes nos chats do `1980` e `9540`.

## 2) Causa raiz

O motor do assistente estava correto no backend, mas o gateway `Baileys` rodava com configuracao minima e sem `getMessage`.

Na pratica:

- o backend recebia o gatilho e gerava a resposta
- o Baileys enviava a mensagem
- o device companion podia pedir `retry receipt` / resend
- sem store de outbound + `getMessage`, o Baileys nao conseguia servir a mensagem original para o retry
- resultado visivel no device: placeholder `Aguardando mensagem`

Evidencia operacional observada:

- `failed to decrypt message`
- `Bad MAC`
- `No matching sessions found for message`
- `MessageCounterError`

## 3) Correcao aplicada

Arquivo impactado:

- `deploy/host2/baileys/src/index.mjs`

Mudancas:

- cache de mensagens outbound por `instance + messageId`
- `getMessage` configurado no socket para atender retry receipts
- helper unico `sendAndRemember(...)` para toda mensagem enviada
- helper `relayAndRemember(...)` para caminhos com `relayMessage(...)`
- `markOnlineOnConnect=false`
- `syncFullHistory=true`
- telemetria de `Baileys getMessage lookup`

## 4) Comentarios tecnicos relevantes

Comentario em codigo com `RUP-2026-013`:

- o cache outbound existe para permitir resend/retry quando companion device recebe placeholder em self-chat

## 5) Validacao

Validado nesta rodada:

- rebuild e restart do `host2-baileys-1`
- smoke de self-chat para `1980` e `9540` apos o patch
- backend continuou disparando resposta normalmente

Ainda pendente nesta mesma correcao:

- validacao visual final no iPhone/Mac apos o patch

## 6) Impacto lateralizado

- reduz discrepancia entre Web e companion devices
- melhora resiliência do gateway para retries de criptografia

## 7) Risco residual

- se a sessao Signal do proprio numero estiver corrompida no auth store, pode ainda exigir reset/repare adicional por instancia
- como o cache e em memoria, retry apos restart do container nao encontra mensagens antigas

## 8) Rollback

1. Restaurar `deploy/host2/baileys/src/index.mjs` para a versao anterior.
2. Rebuild:
   - `cd ~/apps/ruptur-backend/deploy/host2 && docker compose up -d --build baileys`

## 9) Links

- runbook/doc alvo: `docs/governanca/runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`
