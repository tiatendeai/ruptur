<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/processos/identidade-whatsapp-br-wa-id.md
Não edite manualmente aqui sem promover no STATE.
-->

# Processo — Identidade WhatsApp BR, `wa_id` e Nono Digito

## Objetivo

Definir uma regra unica para o ecossistema Ruptur quando um numero brasileiro existe em duas representacoes validas:

- formato de exibicao/negocio com nono digito
- identificador real retornado pelo WhatsApp sem o nono digito em contas antigas

O usuario final nao deve lidar com essa ambiguidade. A interface deve simplificar. O motor deve respeitar a identidade que o WhatsApp realmente usa.

## Premissa operacional

Para o Brasil:

- exibicao, formularios e leitura humana devem preferir o formato atual com nono digito
- transporte, roteamento e resposta devem preferir o identificador real devolvido pelo WhatsApp
- CRM, busca e deduplicacao devem tratar as duas formas como aliases do mesmo contato

## Quatro camadas obrigatorias

1. `display_number`
- formato canonico BR para UX
- exemplo: `5531989131980`

2. `transport_number`
- numero efetivo usado pelo WhatsApp naquela conta/sessao
- pode vir com ou sem o nono digito
- exemplos:
  - `5531989131980`
  - `553189131980`

3. `wa_id` ou `transport_jid`
- identificador de envio/resposta retornado pelo provedor
- exemplos:
  - `5531989131980@s.whatsapp.net`
  - `553189131980@s.whatsapp.net`

4. `instance_effective`
- identificador tecnico da sessao/auth do gateway
- exemplo: `inst-553189131980`

## Regra de ouro

- nunca reescrever um JID explicito ja retornado pelo WhatsApp so para inserir ou remover o nono digito
- quando o WhatsApp informar `wa_id`, `remoteJid`, `me.id` ou equivalente, isso vence a inferencia local
- o nono digito continua valendo para UX, mascaras, inputs e identidade de negocio

## Como a Ruptur deve tratar

### Interface com usuario

- aceitar entrada com e sem `9`
- exibir sempre no formato BR atual com `9`
- esconder o detalhe de transporte
- nunca pedir ao usuario que escolha entre versao com ou sem `9`

### Backend e CRM

- salvar `display_number` como referencia de negocio
- manter alias entre formato com e sem `9`
- deduplicar leads, conversas e busca por qualquer variante
- ao responder, usar o `wa_id` ou JID real do evento de origem

### Gateway Baileys

- para numero cru:
  - pode testar variantes com e sem `9` usando resolucao do provedor
- para JID explicito:
  - deve confiar no JID recebido
- ao conectar:
  - deve expor a identidade que o WhatsApp esta usando para a propria instancia
  - campos operacionais:
    - `me_jid`
    - `number_whatsapp`
    - `number_canonical`
    - `number_display`
    - `number_mode`
    - `number_variants`

### UAZAPI e outros provedores

- sempre que o provedor trouxer `wa_id`, `jid`, `meJid` ou equivalente, usar isso como fonte de verdade de transporte
- nao assumir que o formato de negocio e o mesmo formato do provedor

## Pontos do ecossistema que exigem vigilancia

- `backend/app/services/wa_identity.py`
- `backend/app/api/uazapi_webhook.py`
- `deploy/host2/baileys/src/index.mjs`
- `backend/app/api/baileys_instance.py`
- `web/src/app/connections/ConnectionsClient.tsx`
- CRM:
  - importacao de contatos
  - dedupe de leads
  - busca por telefone
  - merge de conversa
- qualquer formulario que valide telefone BR
- qualquer integracao que reconstrua JID a partir de numero textual

## Antipadroes proibidos

- converter todo numero BR para forma com `9` e usar isso cegamente no transporte
- converter todo numero BR para forma sem `9` e usar isso cegamente no transporte
- substituir `remoteJid` ou `wa_id` do provedor por inferencia local sem evidencia
- misturar `instance_display` com `instance_effective`

## Sinal de saude esperado por instancia

Ao conectar uma instancia, o sistema deve conseguir responder:

- qual numero a UI deve mostrar
- qual numero o WhatsApp realmente esta usando
- qual `me_jid` a sessao devolveu
- quais variantes sao aliases

## Caminho recomendado para futuras correcoes

1. capturar a identidade efetiva da sessao conectada
2. armazenar alias com e sem `9`
3. responder sempre no JID/thread real de origem
4. manter a UI simples, com uma unica identidade visivel ao usuario

## Evidencia externa considerada

- Anatel exige nono digito para numeracao movel no Brasil
- provedores e wrappers WhatsApp relatam falha de entrega ou conversa duplicada quando o motor insere `9` indevidamente
- a orientacao madura do ecossistema e usar o identificador retornado pelo proprio WhatsApp no transporte

## Referencias

- `docs/jornada/correcoes/2026-03-15-rup-2026-011-canonical-number-with-nine.md`
- `docs/jornada/correcoes/2026-03-15-rup-2026-014-whatsapp-identity-wa-id-vs-display-number.md`
- `docs/jornada/correcoes/2026-03-16-rup-2026-015-whatsapp-transport-jid-and-instance-identity.md`
- `RAG/CONTEXT7.md`
- Anatel, nono digito:
  - https://www.gov.br/anatel/pt-br/regulado/numeracao/nono-digito
- whatsapp-web.js, envio falhando em conta antiga com `9`:
  - https://github.com/pedroslopez/whatsapp-web.js/issues/1967
- WAHA, contato/conversa duplicada por diferenca com/sem `9`:
  - https://github.com/devlikeapro/waha/issues/1261
- Evolution API, adicao indevida do `9`:
  - https://github.com/EvolutionAPI/evolution-api/issues/2062
