# RUP-2026-018 — Criacao de instancia com conexao imediata

## Contexto

Depois da inclusao de `criar` e `excluir` no painel, ainda havia um atrito operacional:

- o operador criava a instancia
- depois precisava executar manualmente `conectar` para gerar QR ou pareamento

Para as instancias do assistente, isso aumentava friccao e abria margem para erro de operacao.

## Decisao

No painel da Ruptur, a criacao de instancia deve sair imediatamente em modo de conexao:

- UAZAPI:
  - criar instancia
  - acionar `connect` logo em seguida
- Baileys:
  - criar runtime/auth da instancia
  - acionar `connect` logo em seguida
  - aguardar alguns instantes pelo QR antes de responder ao painel

## Implementacao

### Frontend

- `handleCreateUazapi()` agora:
  - cria a instancia
  - chama `connectUazapiInstance(name)`
  - seleciona a instancia criada
  - volta para `visualizacao`
- `handleCreateBaileys()` agora:
  - cria a instancia
  - chama `connectBaileysInstance(instance)`
  - seleciona a instancia criada
  - volta para `visualizacao`

### Gateway Baileys

- novo helper `waitForQrOrOpen()`
- `POST /instance/connect` espera alguns segundos por:
  - QR disponivel
  - ou conexao `open`

Isso reduz o retorno precoce em `unknown` quando o socket ainda esta negociando o registro multi-device.

## Resultado esperado

- criar nova instancia ja deixa a operacao pronta para escanear QR
- menos cliques e menos ambiguidade no painel
- fluxo mais consistente entre UAZAPI e Baileys
- comportamento alinhado ao uso das instancias do assistente em producao
