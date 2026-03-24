<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/matriz-acionamento-perfis-virtuais.md
Não edite manualmente aqui sem promover no STATE.
-->

# Matriz de acionamento — perfis virtuais canônicos

**Status:** ativo  
**Data:** 2026-03-24  
**Origem:** mesa paralela A+B orquestrada pelo Maestro

---

## 1. Objetivo

Definir, de forma canônica, **quando** cada perfil virtual deve ser acionado, **o que precisa receber** e **que saída mínima deve devolver**.

Esta matriz existe para:

- reduzir falso positivo
- evitar perfil acionado sem necessidade
- preservar velocidade e qualidade
- impedir retrabalho por má delegação

---

## 2. Perfis ativos e recomendados

| Perfil | Acionar quando | Entradas mínimas | Saída mínima obrigatória | Métrica líder |
|---|---|---|---|---|
| `Maestro` | houver múltiplas frentes, conflito ou necessidade de arbitragem | objetivo, restrições, artefatos atuais | decisão, donos, trilha de materialização | tempo até decisão útil |
| `vCEO` | houver missão, cadência, dependência, prazo ou desfecho | demanda, owner, SLA, bloqueios | feito, bloqueado, próximo passo, risco crítico | tempo até primeira entrega útil |
| `vCFO` | houver impacto em caixa, ROI, custo ou viabilidade | hipótese financeira, baseline, impacto esperado | impacto em caixa, risco, próxima ação | custo por entrega aceita |
| `vCVO` | houver priorização, aposta, produto, escopo ou trade-off | hipótese de valor, contexto, restrição | trade-offs, hipótese, teste, recomendação | taxa de aceitação na primeira passada |
| `vOps` | houver performance, automação, infra, confiabilidade ou observabilidade | contexto técnico, alvo, restrições | mudança proposta, risco, rollback, telemetria | falha evitável por mudança |
| `vAudit` | houver risco de falso positivo, promoção, decisão estrutural ou auditoria | escopo, evidência, critérios de aceite | parecer, gaps, gate, aprovação/rejeição | % falso positivo |
| `vController` | houver orçado x realizado, variância, desvio ou unit economics | meta, real, variância, threshold | desvio, owner, correção, prazo | variância fora do threshold |
| `vAdminOps` | houver fila, handoff, rotina, SOP, administrativo ou retrabalho | fluxo atual, owner, SLA, pontos de espera | gargalo, handoff, anti-retrabalho, checkpoint | retrabalho por entrega aceita |
| `vFinOps` | houver custo de cloud/IA/token, throughput ou latência x custo | driver de custo, uso, SLO, baseline | custo unitário, economia segura, risco, rollback | custo unitário por throughput útil |

---

## 3. Regras de acionamento

1. **não acionar perfil por prestígio**; acionar por necessidade real
2. **não duplicar contexto inteiro**; enviar só o recorte da frente
3. perfis financeiros devem explicitar **baseline, desvio e impacto**
4. perfis operacionais devem explicitar **owner, SLA e rollback**
5. perfis estratégicos devem explicitar **hipótese, anti-hipótese e trade-off**
6. qualquer perfil pode devolver `bloqueado` ou `abortado` se a evidência for insuficiente

---

## 4. Times paralelos recomendados

### Frente A — Taxonomia, governança e desenho de time

- `vAudit`
- `vCHRO`
- `vCFO`
- `vCVO`

### Frente B — Runtime, operação e enforcement

- `vOps`
- `vCEO`
- `vCFO`
- `vAudit`

### Frente C — Administrativo/controle (entra quando necessário)

- `vController`
- `vAdminOps`
- `vFinOps`

---

## 5. Condição para promoção a uso ativo

Nenhum perfil novo entra como **ativo de verdade** sem:

- trigger automático ou regra explícita de acionamento
- owner
- runbook ou matriz
- métrica
- backlog
- rollback ou condição de desligamento
