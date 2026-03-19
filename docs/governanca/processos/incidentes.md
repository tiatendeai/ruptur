# Processo de incidentes (mínimo viável)

Base: SRE + ITIL 4 (sem burocracia).

## Objetivo

Reduzir impacto e restaurar serviço com rastreabilidade.

## Fluxo

1. **Detecção**
   - alerta (monitoramento) ou relato (usuário/operação)
2. **Triagem (T0)**
   - impacto: quantos tenants/instâncias? produção ou teste?
   - categoria: uazapi, baileys, rede/dns/tls, backend, banco
3. **Mitigação**
   - aplicar fallback (uazapi → baileys) quando aplicável
   - reduzir escopo (pausar bulk, aumentar delays, limitar endpoints)
4. **Recuperação**
   - restaurar primário (uazapi) e normalizar roteamento
5. **Postmortem**
   - registrar causa raiz e ações preventivas

## Padrões

- Não culpar pessoas; focar em sistema/processo.
- Todo incidente recorrente vira ação: correção + runbook/POP.

