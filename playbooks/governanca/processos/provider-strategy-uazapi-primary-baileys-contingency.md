<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/processos/provider-strategy-uazapi-primary-baileys-contingency.md
Não edite manualmente aqui sem promover no STATE.
-->

# Processo — Estrategia de Providers no MVP

## Decisao

Durante o MVP:

- `UAZAPI` e o transporte primario de producao
- `Baileys` e contingencia estrategica e trilha de aprendizado
- `Ruptur` e o plano de controle acima dos providers

No futuro:

- `Baileys` pode assumir o papel de primario quando atingir maturidade operacional suficiente
- essa troca deve ocorrer por readiness e configuracao, nao por reescrita do dominio

## Motivo

- `UAZAPI` acelera validacao do MVP com mais recursos prontos de plataforma
- `Baileys` reduz dependencia de terceiro e pode virar ativo proprio
- a Ruptur precisa aprender com ambos sem se tornar refem do contrato de nenhum

## Ownership aprovado

### Ruptur

- identidade interna de conexao
- CRM, lead, conversa e historico
- assistente, politicas e roteamento
- observabilidade e failover
- regra de ownership por instancia

### UAZAPI

- transporte primario do MVP
- lifecycle da instancia
- QR/pairing
- webhook nativo
- settings de instancia
- recursos nativos de plataforma quando escolhidos conscientemente

### Baileys

- transporte de contingencia no MVP
- sessao/auth
- QR/pairing
- send/receive
- identidade efetiva da conta conectada
- retry/getMessage

## Regras obrigatorias

1. O contrato interno da Ruptur nao pode ser o contrato da UAZAPI.
2. O painel pode mostrar os dois providers, mas isso nao significa paridade de papel no MVP.
3. `Baileys` deve permanecer funcional e observavel, mas com escopo minimo operacional enquanto for contingencia.
4. Se o assistente da Ruptur for o dono da conversa, recursos nativos de chatbot/AI/triggers do provider nao podem competir no mesmo fluxo.
5. Toda instancia deve ter papel explicito:
   - `primary`
   - `contingency`

## Identidades que nao podem ser confundidas

- `connection_id`: identidade interna da Ruptur
- `provider_instance_id`: identidade exigida pelo provider
- `display_number`: numero exibido ao operador
- `transport_identity`: `wa_id`, `jid`, `phone_number_id` ou equivalente do transporte

## Antipadroes proibidos

- construir a Ruptur como se a UAZAPI fosse a arquitetura final
- tratar Baileys como canal principal antes de readiness real
- deixar provider-native chatbot e assistente Ruptur responderem juntos
- vazar regra de normalizacao do provider para o dominio/CRM

## Sinal de maturidade para futura virada do Baileys

- auth state duravel
- reconnect previsivel
- reset/re-pair operacional
- historico e retry confiaveis
- observabilidade e health consistentes
- UI operacional suficiente para suporte

## Resultado esperado

- MVP com menos risco e mais velocidade
- arquitetura preparada para troca futura de primario
- menos retrabalho ao reduzir dependencia da UAZAPI
