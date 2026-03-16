# Registro de Correcao

- `id`: RUP-2026-014
- `data`: 2026-03-15
- `sistema`: ruptur
- `times_impactados`: backend | frontend | integracoes | produto
- `owner_tecnico`: codex
- `owner_economico`: diego
- `status`: concluido

## 1) Contexto

Depois da estabilizacao de sessao/QR, permaneceu uma disparidade no ecossistema WhatsApp:

- a UI e o negocio passaram a preferir o formato BR com nono digito
- o WhatsApp Web oficial continuava exibindo, em alguns casos, a identidade antiga sem o `9`
- respostas podiam parecer cair em thread diferente quando a camada de transporte recodificava o JID

O sintoma observado foi: `5531989131980` e `553189131980` apareciam como identidades distintas em alguns clientes oficiais da Meta.

## 2) Causa raiz

A causa raiz confirmada foi mistura indevida entre duas camadas diferentes:

- identidade de exibicao/negocio
- identidade real de transporte do WhatsApp (`wa_id`/JID)

O ecossistema BR permite o formato atual com nono digito para UX e discagem, mas contas antigas podem continuar sendo tratadas internamente pelo WhatsApp sem o `9`.

Quando a camada Ruptur/Baileys forca o `9` em um JID explicito ja devolvido pelo WhatsApp, surgem efeitos colaterais como:

- thread paralela
- nao entrega
- contato/conversa duplicado

## 3) Correcao aplicada

- preservado o JID explicito vindo do WhatsApp no caminho de resposta do webhook
- preservado o JID explicito no gateway Baileys, sem recanonizar numero BR quando o dado ja vem como `@s.whatsapp.net`
- interface de conexoes ajustada para operar por identificador publico canonico, mantendo o identificador efetivo apenas como detalhe tecnico
- criada regra operacional formal para separar:
  - `display_number`
  - `transport_number`
  - `wa_id`
  - `instance_effective`

## 4) Comentarios tecnicos relevantes

Pontos que precisam permanecer comentados com esta regra no codigo-fonte principal:

- `backend/app/api/uazapi_webhook.py`
- `deploy/host2/baileys/src/index.mjs`
- `backend/app/api/baileys_instance.py`

Comentario esperado:
- numero BR canonico serve para UX e negocio
- `wa_id`/JID explicito do WhatsApp vence no transporte

## 5) Validacao

- logs do backend mostraram resposta em `5531989131980@s.whatsapp.net` usando a sessao efetiva `inst-553189131980`
- API de status mostrou a mesma instancia aceitando:
  - `inst-5531989131980`
  - `inst-553189131980`
- CRM manteve um unico lead canonico para o numero
- pesquisa de ecossistema confirmou casos equivalentes em wrappers e gateways WhatsApp no Brasil

## 6) Impacto lateralizado

- frontend:
  - deve simplificar a identidade visivel ao operador
- backend:
  - nao pode mais reescrever `remoteJid` ou `wa_id` sem evidencia
- CRM:
  - deve tratar com e sem `9` como aliases
- produto:
  - nao deve transferir essa ambiguidade para o usuario final

## 7) Risco residual

- enquanto a identidade efetiva da instancia nao for exposta diretamente pelo gateway/UI, ainda existe espaco para leitura operacional errada
- outras integracoes no ecossistema podem continuar reconstruindo JID a partir de telefone textual
- qualquer nova camada que aplique mascara BR no motor pode reintroduzir o bug

## 8) Rollback

- reverter apenas para a regra anterior de recanonizacao forcada nao e recomendado
- se houver incidente, o rollback aceitavel e apenas operacional:
  - responder no JID original do evento
  - manter numero canonico apenas para exibicao

## 9) Links

- runbook/doc atualizada:
  - `docs/governanca/processos/identidade-whatsapp-br-wa-id.md`
  - `docs/governanca/runbooks/runbook-revisao-assistente-whatsapp-2026-03-15.md`
  - `RAG/CONTEXT7.md`
- evidencia externa:
  - https://www.gov.br/anatel/pt-br/regulado/numeracao/nono-digito
  - https://github.com/pedroslopez/whatsapp-web.js/issues/1967
  - https://github.com/devlikeapro/waha/issues/1261
  - https://github.com/EvolutionAPI/evolution-api/issues/2062
