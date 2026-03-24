<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/pops/pop-failover-uazapi-para-baileys.md
Não edite manualmente aqui sem promover no STATE.
-->

# POP — Failover: UAZAPI → Baileys

## Objetivo

Manter operação quando a uazapi estiver indisponível, usando Baileys como contingência.

## Gatilhos

- uazapi retorna 5xx
- timeout
- rate limit
- instância `disconnected` e não reconecta no SLA

## Passo a passo

1) Confirmar incidente
- checar status/health uazapi
- checar logs de erro no Ruptur (upstream_status/upstream_body)

2) Reduzir risco
- pausar envios em massa (bulk)
- aumentar delays (se aplicável)

3) Ativar fallback
- configurar roteamento `provider=auto` para permitir fallback
- ou forçar `provider=baileys` por tenant/instância (temporário)

4) Validar
- envio de texto e mídia para um número de teste
- checar entrega

5) Voltar ao primário
- quando uazapi estabilizar, remover o forçado e voltar para `provider=auto`

## Observações

- Botões/interativos podem não renderizar igual no Baileys; sempre enviar URL no texto.
