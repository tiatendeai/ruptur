<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-24-mesa-perfis-virtuais-governanca-e-enforcement.md
Não edite manualmente aqui sem promover no STATE.
-->

# Mesa ampliada — perfis virtuais, governança, enforcement e materialização

**Data:** 2026-03-24  
**Status:** ativo  
**Origem:** mesa ampliada conduzida pelo Maestro a pedido direto do operador  
**Escopo:** nomenclatura canônica, composição do time virtual, critérios de "não fazer", métricas, gatilhos automáticos e materialização obrigatória

---

## 1. Decisão central

O ecossistema Ruptur passa a tratar como **canônico** que:

1. perfis estratégicos e táticos operados por agentes são **virtuais**
2. C-Levels virtuais usam prefixo **`v`**
3. perfis táticos/operacionais seguem a convenção **`v` + domínio / `Ops`**
4. apelidos sobrevivem apenas como **alias**, nunca como nome principal de governança

Exemplos:

- `vCVO` = nome canônico
- `VisionCO` = alias aceito
- `vCEO` = nome canônico
- `Eggs` = alias aceito

---

## 2. O que temos, o que deveríamos ter e o que poderíamos ter

### 2.1 Ativos canônicos

| Perfil | Papel | Status |
|---|---|---|
| `Maestro` | coordenação e arbitragem | ativo |
| `vCEO` | execução, cadência e desfecho | ativo |
| `vCFO` | viabilidade, ROI e custo real | ativo |
| `vCVO` | visão, valor percebido e priorização | ativo |
| `vOps` | automação, telemetria, confiabilidade | ativo |
| `vAudit` | falso positivo, aceitação e gate | ativo |
| `vLegal` | compliance e fronteiras de uso | ativo |
| `vCHRO` | desenho de time e capacidade | ativo |

### 2.2 Recomendados para a próxima camada

| Perfil | Papel | Motivo |
|---|---|---|
| `vController` | budget, variância, unit economics | falta elo entre estratégia financeira e controle diário |
| `vAdminOps` | SOPs, filas, handoffs, administrativo | falta dono explícito para processo e retrabalho |

### 2.3 Condicionais

| Perfil | Papel | Quando nasce |
|---|---|---|
| `vFinOps` | custo de infra + IA | quando custo exigir dono dedicado |
| `vSecOps` | risco e endurecimento | quando a superfície de risco crescer |
| `vSalesOps` | operação comercial | quando pipeline exigir operação própria |
| `vCMO` | growth | quando growth deixar de caber em visão/produto |
| `vCTO` | arquitetura de plataforma | quando vOps ficar largo demais |

---

## 3. Conclusão da mesa sobre falso positivo e "não fazer"

### 3.1 Princípio

**Falso positivo custa caro.**  
Executar o que não deveria ser feito é, na prática, um vazamento de caixa, foco e confiança.

### 3.2 Regra

Nenhuma otimização de custo, tempo ou automação pode:

- piorar a taxa de acerto na primeira passada
- aumentar retrabalho
- ocultar caminhos proibidos
- empurrar revisão excessiva para humano
- reduzir a capacidade de negar, bloquear ou abortar

### 3.3 Obrigação de saída

Toda resposta estratégica ou operacional relevante deve deixar explícito:

1. **caminhos recomendados**
2. **caminhos não seguir**
3. **condição de bloqueio**
4. **condição de aborto**
5. **evidência que falta**

---

## 4. Convergência com práticas maduras de mercado

Leitura sintética das referências oficiais consultadas:

- **OpenAI** converge em `prompt caching`, `structured outputs` e `trace grading`
- **Anthropic** converge em critério de sucesso explícito, avaliação iterativa e caching
- **Microsoft** converge em observabilidade, evaluators, tracing e monitoramento contínuo
- **Google** converge em otimização de prompt orientada por evidência
- **AWS** converge em guardrails, prompt-injection defense e reasoning checks

### Síntese aplicada ao Ruptur

Os "bigs" não tratam economia como corte cego de prompt.  
Tratam como combinação de:

1. gating
2. schema
3. avaliação
4. observabilidade
5. caching
6. rotas de aborto/negação

---

## 5. Literatura principal e aplicação

### 5.1 A Startup Enxuta

Aplicação:

- toda mudança vira hipótese
- toda hipótese vira experimento
- toda melhoria precisa provar efeito em métrica, não sensação

### 5.2 Lean / discovery aplicado

Aplicação:

- hipótese explícita
- métrica anti-vaidade
- aprendizado validado
- ciclo curto
- pivotar ou perseverar

### 5.3 The Mom Test / discovery prático

Aplicação:

- priorizar comportamento real sobre opinião hipotética
- evitar validação por survey cedo demais quando a hipótese ainda é difusa
- usar perguntas orientadas a retrabalho, dor real e processo atual

### 5.4 Testing Business Ideas / test-card logic

Aplicação:

- toda mudança crítica precisa de:
  - hipótese
  - teste
  - limiar
  - custo de erro
  - condição de invalidação

---

## 6. Métricas obrigatórias

As mudanças desta frente devem ser avaliadas por:

- `% de falso positivo`
- `% de falso negativo`
- `taxa de aceitação na primeira passada`
- `retrabalho por entrega aceita`
- `tempo até primeira entrega útil`
- `custo por entrega aceita`
- `tempo até negativa segura`
- `% de saídas com caminhos proibidos explicitados`

---

## 7. Contrato de materialização

O que sair das mesas não pode morrer em chat.

Toda saída relevante precisa materializar em uma ou mais destas superfícies:

- `registry/`
- `constitution/`
- `playbooks/`
- `knowledge/`
- backlog canônico
- GitHub Projects
- trace
- commit

Sem isso, a decisão não é considerada absorvida pelo ecossistema.

---

## 8. Gatilhos automáticos exigidos

Passa a ser obrigatório disparar revisão especial quando aparecerem termos como:

- `falso positivo`
- `retrabalho`
- `não fazer`
- `risco`
- `guardrail`
- `hipótese`
- `experimento`
- `lean`
- `backlog`
- `governança`

Perfis mínimos acionados conforme o caso:

- `vAudit`
- `vCFO`
- `vCVO`
- `vCEO`
- `vOps`

---

## 9. Decisões desta rodada

1. `vCVO` é o nome canônico; `VisionCO` é alias aceito
2. `vCEO` é o nome canônico; `Eggs` é alias aceito
3. devemos formalizar `vController` e `vAdminOps` como próxima camada recomendada
4. nenhuma mesa fecha sem materialização em backlog/rule/runbook/trace/project item
5. o sistema deve aumentar sua capacidade de **negar**, **bloquear** e **abortar** com motivo explícito
6. otimização de custo só vale se reduzir desperdício **sem reduzir potência**
7. a execução paralela das frentes A e B materializa `vController`, `vAdminOps` e `vFinOps` com matriz de acionamento e enforcement runtime mínimo

---

## 10. Backlog derivado

Itens novos ligados a esta rodada:

- `JARVIS-AUT-011` — taxonomia canônica dos perfis virtuais
- `JARVIS-AUT-012` — gate de no-go / falso positivo / aborto
- `JARVIS-AUT-013` — pipeline de materialização pós-mesa
- `JARVIS-AUT-014` — ativação automática com garantia de uso ativo
- `JARVIS-AUT-015` — formalização de `vController`, `vAdminOps` e `vFinOps`
- `JARVIS-AUT-016` — enforcement runtime da matriz de acionamento / no-go / bloqueio / aborto
- `JARVIS-AUT-017` — telemetria mínima de governança com triggers e score de aderência ao no-go

---

## 11. Fontes

### Locais

- `registry/agents.yaml`
- `registry/intelligence_triggers.yaml`
- `constitution/constituicao_organizacional_ruptur.md`
- `playbooks/auto_intelligence_hook.md`
- `playbooks/jarvis.intake-gate.md`
- `memory/jarvis.state-model.md`
- `knowledge/trace-grading.md`
- `registry/catalog.yaml`

### Externas

- OpenAI — Prompt Caching
- OpenAI — Structured Outputs
- OpenAI — Trace Grading
- Anthropic — Prompt Engineering / Evaluate / Prompt Caching
- Microsoft Foundry — Observability in Generative AI
- Google Vertex AI — Prompt Optimizer
- AWS Bedrock — Guardrails / Automated Reasoning checks
- The Lean Startup
- Lean Analytics
- Testing Business Ideas
- Continuous Discovery Habits
- The Mom Test
