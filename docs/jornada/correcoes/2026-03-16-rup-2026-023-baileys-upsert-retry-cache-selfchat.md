# RUP-2026-023 - Baileys upsert retry cache para self-chat

- `id`: RUP-2026-023
- `data`: 2026-03-16
- `sistema`: ruptur
- `times_impactados`: transporte | backend | operacao
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Mesmo com `getMessage` persistente e com os assistentes respondendo no `1980`, o `Baileys` ainda apresentava placeholder em alguns clientes no fluxo de self-chat. Os logs mostravam retries e decrypts do WhatsApp para mensagens recentes, mas o cache do gateway atendia apenas mensagens enviadas diretamente pela API do `Baileys`.

## 2) Causa raiz

No self-chat multi-device, mensagens do proprio usuario podem chegar ao socket via `messages.upsert` com `fromMe=true`, mesmo quando foram originadas em outro dispositivo vinculado. Se um companion pede retry dessas mensagens, o `getMessage` precisa conhece-las. O gateway so guardava envelopes enviados por `sendMessage`/`relayMessage`, entao havia `miss` para parte do trafego de self-chat.

## 3) Correcao aplicada

- `deploy/host2/baileys/src/index.mjs`
  - introduzido `rememberMessageEnvelope(...)` como funcao central de cache para retry
  - `rememberSentMessage(...)` passou a delegar para essa funcao
  - adicionado `shouldCacheUpsertMessage(...)` para memorizar mensagens elegiveis vindas de `messages.upsert`
  - o gateway agora persiste no cache de retry:
    - mensagens `fromMe`
    - mensagens diretas de usuario
    - mensagens `@lid` relevantes para self-chat

## 4) Comentarios tecnicos relevantes

- `RUP-2026-023`: o cache de retry agora cobre dois caminhos distintos:
  - mensagens geradas pelo proprio gateway
  - mensagens entregues ao socket por outro linked device
- isso reduz o risco de placeholder quando o WhatsApp pede resend de mensagens recentes no self-chat.

## 5) Validacao

- `node --check deploy/host2/baileys/src/index.mjs`
- rebuild do container `host2-baileys`
- teste vivo no `1980` apos o deploy
- resultado:
  - mensagens do assistente no chat principal `5531989131980@s.whatsapp.net` passaram a registrar `Baileys getMessage lookup` com `found=true`
  - nao houve `miss` nas respostas `3EB0...` do teste apos o patch

## 6) Impacto lateralizado

- transporte: melhora a capacidade de retry em self-chat multi-device
- operacao: reduz o gap entre envio bem-sucedido e placeholder em clientes secundarios
- backend: nenhuma mudanca de contrato; o ajuste ficou isolado no adapter `Baileys`

## 7) Risco residual

- ainda ha ruído de sessao no thread oficial `162611857477871@lid` (`Conta Oficial do Wtz`)
- esse resíduo nao ficou associado, no teste atual, ao chat principal `5531989131980@s.whatsapp.net`
- se o placeholder persistir visualmente no cliente mesmo com `found=true`, o proximo alvo passa a ser a sessao/identidade desse thread `@lid`, nao mais o cache de retry do chat principal

## 8) Rollback

- restaurar a versao anterior de `deploy/host2/baileys/src/index.mjs`
- rebuildar `host2-baileys`
- gatilho de rollback: crescimento anormal do cache, regressao em `messages.upsert`, ou erro novo de envio

## 9) Links

- runbook/doc atualizada:
  - `RAG/CONTEXT7.md`
  - `docs/jornada/correcoes/README.md`
