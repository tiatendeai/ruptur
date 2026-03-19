# RUP-2026-016 — Reset limpo de sessao Baileys e limpeza de auth stale

## Contexto

Mesmo apos re-pareamento, ainda surgiram sinais de sessao criptografica degradada em parte das instancias:

- `Bad MAC`
- `No matching sessions found for message`
- `MessageCounterError`
- placeholder `Aguardando mensagem. Essa acao pode levar alguns instantes.`

O padrao observado tambem aparece em outras stacks baseadas em Baileys, incluindo Evolution API.

## Problema

- reconectar a instancia sem limpar completamente auth/chaves stale pode preservar material criptografico ruim
- o operador nao tinha um mecanismo interno simples para resetar a sessao Baileys pela propria Ruptur
- logout invalido ou sessao expirada podiam deixar artefatos locais prontos para contaminar o proximo pareamento

## Decisao

Adicionar reset limpo de sessao Baileys, com:

- logout da sessao quando houver reset manual
- limpeza de `authDir`
- limpeza do cache/store persistido de mensagens outbound
- bloqueio de auto-reconnect enquanto a instancia estiver em reset
- limpeza automatica de auth stale quando o WhatsApp reportar `loggedOut`

## Implementacao

### Gateway Baileys

- novo endpoint `POST /instance/reset`
- funcoes internas para:
  - limpar auth local da instancia
  - limpar store persistido de mensagens
  - purgar cache em memoria
  - evitar reconexao automatica durante reset

### Backend/API

- novo endpoint `POST /integrations/baileys/reset?instance=...`

### Web operacional

- novo botao `Resetar sessao` no painel Baileys da tela de conexoes
- fluxo preparado para emitir novo QR apos reset

## Referencia externa considerada

Padrao semelhante observado na Evolution API:

- endurecimento de reconnect/logout com limpeza de chaves antigas
- tratamento de `waiting for message` e material criptografico invalido apos reconexao

## Arquivos impactados

- `deploy/host2/baileys/src/index.mjs`
- `backend/app/api/baileys_instance.py`
- `web/src/lib/ruptur.ts`
- `web/src/app/connections/ConnectionsClient.tsx`

## Resultado esperado

- reduzir reincidencia de sessao stale apos reconectar
- permitir reset operacional sem acesso manual ao volume Docker
- aproximar a operacao Ruptur do hardening observado no ecossistema Evolution/Baileys
