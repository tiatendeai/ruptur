# RUP-2026-015 — WhatsApp Transport JID e Identidade Efetiva da Instancia

## Contexto

Depois da estabilizacao de sessao no Baileys, restou uma lacuna operacional: o ecossistema ainda respondia corretamente no JID real do WhatsApp, mas a identidade efetiva de cada instancia nao ficava visivel no status/health da stack.

Isso mantinha risco de regressao em contas brasileiras onde:

- a UI e o negocio usam numero com nono digito
- o WhatsApp pode manter `wa_id` ou `me.id` sem o nono digito
- operadores viam apenas o identificador canonico da instancia, sem saber como o WhatsApp estava identificando a conta naquele momento

## Problema

- o gateway Baileys nao expunha `me_jid`, `number_whatsapp`, `number_display`, `number_mode` e `number_variants` em `/health` e `/instance/status`
- a interface de conexoes da Ruptur nao refletia a identidade efetiva do WhatsApp para a instancia selecionada
- havia risco de futuros ajustes voltarem a forcar o numero BR com `9` no transporte por falta de visibilidade operacional

## Decisao

Separar de forma explicita:

- identidade de UX/negocio
- identidade de transporte do WhatsApp
- identificador tecnico da sessao Baileys

E publicar essa separacao nas APIs operacionais e na interface interna de conexoes, sem transferir essa complexidade ao usuario final.

## Implementacao

### Gateway Baileys

- capturar `me.id` da sessao conectada e persistir em `lastConnection`
- derivar por instancia:
  - `me_jid`
  - `number_whatsapp`
  - `number_canonical`
  - `number_display`
  - `number_mode`
  - `number_variants`
- incluir esses campos em:
  - `GET /health`
  - `GET /instance/status`

### Backend/API

- manter decoracao de instancia com:
  - `instance_effective`
  - `instance_canonical`
  - `instance_display`
- preservar os novos campos de identidade devolvidos pelo gateway

### Web operacional

- consumir os novos campos na tela de conexoes
- mostrar numero de exibicao e numero efetivo do WhatsApp apenas no painel interno
- manter a UX principal simplificada:
  - numero BR com `9` para exibicao
  - transporte automatico no JID real

## Arquivos impactados

- `deploy/host2/baileys/src/index.mjs`
- `backend/app/api/baileys_instance.py`
- `web/src/lib/ruptur.ts`
- `web/src/app/connections/ConnectionsClient.tsx`

## Validacao

- `GET https://baileys.ruptur.cloud/health`
- `GET https://api.ruptur.cloud/integrations/baileys/status?instance=inst-5531981139540`
- `GET https://api.ruptur.cloud/integrations/baileys/status?instance=inst-5531989131980`
- rebuild do `ruptur-web`
- rebuild do `baileys`

## Resultado esperado

- a operacao consegue ver como o WhatsApp esta tratando cada instancia conectada
- o numero BR com `9` continua sendo a face visivel para UX
- o motor continua respondendo no JID/thread efetivo do WhatsApp
- reduzimos o risco de regressao futura por forca de canonicalizacao indevida
