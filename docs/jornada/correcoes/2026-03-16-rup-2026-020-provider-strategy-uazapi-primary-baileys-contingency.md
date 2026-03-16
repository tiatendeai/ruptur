# RUP-2026-020 — Estrategia de Providers do MVP

## Contexto

As conversas e correcoes recentes mostraram que a operacao estava tratando `UAZAPI` e `Baileys` com simetria excessiva no painel e na linguagem de implementacao, apesar de a regra de negocio do MVP ser:

- `UAZAPI` como canal primario
- `Baileys` como contingencia estrategica

Ao mesmo tempo, a visao de medio prazo mantem `Baileys` como ativo candidato a principal no futuro, porque e self-hosted e pode reduzir dependencia externa.

## Decisao

Formalizar a estrategia em tres camadas:

1. `Ruptur`
- plano de controle
- CRM, assistente, identidade, politicas e failover

2. `UAZAPI`
- transporte primario do MVP

3. `Baileys`
- contingencia estrategica no MVP
- candidato a futuro transporte primario quando houver maturidade operacional suficiente

## Ajustes aplicados

- `CONTEXT7` atualizado com a estrategia por fase, ownership e regras de exclusividade de chatbot
- README de governanca atualizado para registrar o contrato acima dos providers
- novo processo adicionado em `docs/governanca/processos/provider-strategy-uazapi-primary-baileys-contingency.md`
- FAQ operacional atualizada para refletir a estrategia correta
- painel de conexoes ajustado para comunicar `UAZAPI` como primario e `Baileys` como contingencia, sem remover a operacao dos dois providers

## Regras aprovadas

- o contrato interno da Ruptur nao pode ser o contrato da UAZAPI
- provider-native chatbot/AI/triggers nao deve competir com o assistente da Ruptur na mesma instancia sem policy explicita
- `Baileys` deve ser endurecido desde o MVP, mas sem receber paridade de produto antes da hora
- a troca futura de primario deve ocorrer por readiness, nao por reescrita de dominio

## Impacto esperado

- menos ambiguidade no painel e na documentacao
- menos risco de acoplamento estrutural ao provider principal do MVP
- base mais clara para backlog de failover e futura virada de primario
