# RUP-2026-019 — Baileys com atributos funcionais de criacao e sem ghost status

Data: 2026-03-16

## Contexto

O painel de conexoes da Ruptur passou a criar/excluir instancias Baileys, mas ainda havia duas lacunas:

- a criacao Baileys expunha apenas `instanceId`, sem atributos operacionais uteis
- consultar `status`/`qr` de um ID inexistente no Baileys podia iniciar uma sessao fantasma por lazy start

Na pratica, isso poluia o painel com linhas que nao representavam uma sessao Baileys real e confundia a operacao quando uma instancia existia apenas na UAZAPI.

## Correcao aplicada

- o gateway Baileys passou a aceitar e persistir metadados funcionais de instancia:
  - `profileName`
  - `systemName`
  - `adminField01`
  - `adminField02`
  - `browser`
  - `syncFullHistory`
  - `markOnlineOnConnect`
- `POST /instance` agora cria a sessao e ja espera a transicao para `open` ou emissao de `QR`
- `GET /instance/status` e `GET /qr.png` nao criam mais uma instancia nova por simples inspecao; agora retornam `404` quando a instancia nao existe
- o painel passou a:
  - mostrar os campos funcionais de criacao Baileys
  - usar o retorno do `create` como caminho principal de pareamento
  - bloquear acoes Baileys quando a linha selecionada nao tem uma sessao Baileys real

## Validacao

- `POST /integrations/baileys/instances` com payload de atributos funcionais retornou `connecting` com `qrcode`
- os metadados persistidos voltaram no payload de status
- `GET /integrations/baileys/status?instance=<id-inexistente>` passou a retornar `404 baileys_instance_not_found`
- a sessao fantasma `tm2mfa` criada pelo comportamento antigo foi removida da camada Baileys

## Fonte oficial usada para pertinencia

Os campos funcionais expostos seguem o que e pertinente ao `SocketConfig` oficial do Baileys:

- `browser`
- `markOnlineOnConnect`
- `syncFullHistory`
- `getMessage`

Campos administrativos adicionais ficam na camada operacional da Ruptur, nao no protocolo do WhatsApp.
