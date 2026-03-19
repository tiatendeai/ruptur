# Runbook — Revisao Assistente WhatsApp (2026-03-15)

## Objetivo

Consolidar as correcoes criticas aplicadas no fluxo WhatsApp (Baileys + backend) para manter continuidade entre times de backend, devops e sustentacao.

## Escopo desta revisao

- self-chat inconsistente entre Web/Desktop/Mobile
- ativacao `Iazinha` nao disparando em parte dos cenarios
- risco de loop e respostas indevidas
- presenca visual ausente (`digitando`/`gravando`)
- erro de execucao no caminho de sessao ativa do agente

## Correcoes aplicadas

1. `RUP-2026-007` — Normalizacao de identidade/JID e gatilho seguro
- `@lid`, `@newsletter` e `@broadcast` deixaram de ser tratados como telefone.
- canonicalizacao passou a preferir `wa_chatid` e `wa_sender`.
- resposta passou a mirar JID canonico de telefone (evita responder para identificadores efemeros).
- gate de resposta reforcado para anti-loop e anti-grupo.

2. `RUP-2026-008` — Presenca de UX antes de envio
- em `send/text`: envia `composing` antes de mensagem.
- em `send/media` de audio/PTT: envia `recording` antes de mensagem.
- finaliza com `paused` apos envio.

3. `RUP-2026-009` — Compatibilidade com assinatura atual do `AgentService`
- chamada antiga de `get_response(...)` foi adaptada para assinatura nova (`profile`, `principal_name`, `user_message`).
- aplicado prefixo de persona no retorno para manter contrato conversacional.

4. `RUP-2026-010` — Filtro de encaminhamento no Baileys
- grupos/status deixaram de ser encaminhados por padrao para o webhook principal.
- reduz saturacao e melhora resposta em conversas 1:1.

5. `RUP-2026-011` — Canonico BR atual com 9
- numeros canônicos de negocio passaram para o formato atual BR (com 9).
- formato legado sem 9 segue aceito apenas como alias para compatibilidade.

6. `RUP-2026-014` — Identidade WhatsApp: `wa_id` vence no transporte
- numero BR com `9` permanece como formato de UX e negocio.
- JID explicito retornado pelo WhatsApp nao deve ser reescrito apenas para inserir/remover o `9`.
- a regra correta passa a separar:
  - exibicao
  - transporte
  - sessao efetiva da instancia

7. `RUP-2026-013` — Retry/resend real para self-chat companion
- Baileys passou a manter cache outbound por mensagem enviada.
- `getMessage` foi configurado no socket para atender retry receipts de iPhone/Mac.
- alvo: eliminar placeholders `Aguardando mensagem` em self-chat entre devices.

8. `RUP-2026-015` — Identidade efetiva da instancia exposta em status/health
- o gateway passou a publicar `me_jid`, `number_whatsapp`, `number_display`, `number_mode` e `number_variants`.
- a interface de conexoes passou a mostrar a identidade efetiva do WhatsApp apenas no painel interno.
- a UX principal continua simplificada com numero BR canonico na exibicao.

9. `RUP-2026-016` — Reset limpo de sessao Baileys
- novo reset operacional da instancia Baileys com limpeza de auth e cache outbound stale.
- logout `loggedOut` passou a acionar limpeza de artefatos locais invalidos.
- a tela de conexoes passou a permitir reset controlado para regenerar QR.

## Arquivos impactados (codigo-fonte)

- `backend/app/services/wa_identity.py`
- `backend/app/services/uazapi_ingest.py`
- `backend/app/api/uazapi_webhook.py`
- `deploy/host2/baileys/src/index.mjs`
- `backend/app/api/baileys_instance.py`
- `web/src/app/connections/ConnectionsClient.tsx`

## Validacao operacional executada

- deploy com `docker compose up -d --build` para `baileys` e `ruptur-backend`.
- health-check:
  - `https://api.ruptur.cloud/health`
  - `https://baileys.ruptur.cloud/health`
- testes de webhook sintético para `553181139540` e `553189131980` com:
  - `Iazinha` (ativacao)
  - turno de conversa em sessao ativa
  - requisicao de resposta em audio
- evidencias em log:
  - `self_chat=True`
  - `should_respond=True` nos gatilhos corretos
  - envio por instancia nomeada correta (`inst-553181139540` e `inst-553189131980`)
  - `audio=True` com envio PTT concluido

## Operacao e monitoracao

- checar status das instancias:
  - `GET /instance/status?instance=inst-553181139540`
  - `GET /instance/status?instance=inst-553189131980`
- para identidade correta da instancia:
  - preferir o `me.id`/JID retornado pela sessao conectada
  - tratar numero com `9` apenas como camada de exibicao se houver divergencia
  - validar tambem `number_whatsapp`, `number_display` e `number_mode` no status operacional
- se `inst-553189131980` aparecer `unknown`, reconectar:
  - `POST /instance/connect?instance=inst-553189131980`
- se persistirem `Bad MAC`, `No matching sessions found for message` ou placeholder em cliente oficial:
  - `POST /instance/reset?instance=<instancia>`
  - reescanear o QR da instancia afetada
- observar logs de guard/loop:
  - backend: `Trigger ... should_respond=...`
  - baileys: `Outbound guard bloqueou ...` e falhas de webhook forward

## Rollback rapido

1. Restaurar arquivos anteriores no host2.
2. Rebuild seletivo:
- `docker compose up -d --build baileys`
- `docker compose up -d --build ruptur-backend`
3. Revalidar health e status de instancias.

## Observacoes para times

- `Bad Gateway` logo apos `recreate` pode ocorrer por janela curta de convergencia do Traefik.
- evitar usar testes em grupos para validacao de assistente (regra de bloqueio permanece ativa).
