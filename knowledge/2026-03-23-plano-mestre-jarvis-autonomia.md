<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-23-plano-mestre-jarvis-autonomia.md
Não edite manualmente aqui sem promover no STATE.
-->

# Plano mestre — Jarvis auto-operável com gate canônico

**Data:** 2026-03-23  
**Status:** plano mestre inicial  
**Escopo:** `alpha`, `state`, `omega`, `codex/ruptur`

---

## 1. Norte

Transformar o Jarvis em um ecossistema que:

- ativa sessões rastreáveis
- opera com contexto vivo e governança canônica
- mede a própria atuação
- sabe quando pausar, quando fechar e quando capitalizar
- evolui sem depender exclusivamente de memória manual do operador

Sem perder:

- separação entre gênese e operação
- prudência de governança
- capacidade de rollback e recovery
- controle sobre ações sensíveis

---

## 2. Princípios não negociáveis

1. `alpha` ancora identidade; não vira runtime.  
2. `state` governa; não vira execução cega.  
3. `omega` continua sessões; não cria entidade nova.  
4. `ruptur` opera; não redefine soberania canônica.  
5. automação sem trilha auditável não conta como automação madura.  
6. auto-incremento do `state` precisa de gate, nunca de promoção cega.  
7. sessão ativa de verdade não pode ser encerrada só por conveniência.  

---

## 3. Fases do plano mestre

## Fase 0 — estabilização imediata

### Objetivo

Concluir o que torna a sessão atual e a próxima sessão seguras e retomáveis.

### Entregas

- sessão oficial materializada em `omega` e `ruptur`
- handoff explícito
- regra provisória de `session_id`
- débito de autoencerramento documentado
- backlog canônico inicial

### Saída esperada

Próxima sessão nasce sem improvisar leitura, persistência e reconciliação básica.

---

## Fase 1 — lifecycle confiável de sessão

### Objetivo

Fazer o `omega` sair de “protocolo promissor” para “ciclo utilizável”.

### Entregas

- heartbeat / `last_activity_at`
- estados `stale`, `suspenso`, `handoff_pendente`, `closed`
- `closure_reason`
- política de autoencerramento auditável
- canonização do vínculo `session_id` ↔ artifacts

### Métricas

- `% de sessões com artifact em omega`
- `% de sessões com espelho operacional`
- `% de sessões encerradas com motivo`
- `% de falso positivo no autoencerramento`

---

## Fase 2 — rastreabilidade operacional total

### Objetivo

Fechar o elo entre sessão, execução, backlog e entrega.

### Entregas

- bridge `session_id` ↔ branch ↔ commit ↔ workflow run ↔ issue ↔ project item
- telemetria estruturada do Jarvis e dos perfis
- trilha de skill runtime e eficácia por perfil
- observabilidade de custo, bloqueio, duração e desfecho

### Métricas

- `% de sessões com branch vinculada`
- `% de entregas com issue/project item vinculado`
- `% de chamadas/perfis com telemetria`
- tempo médio entre ativação e capitalização

---

## Fase 3 — governança auto-incremental com gate

### Objetivo

Permitir que o `state` seja alimentado continuamente sem virar refém do runtime.

### Entregas

- inbox de promoção
- reconciliação entre runtime, sessão e canônico
- geração assistida de decisão/débito/playbook
- trilha institucional de aceitação, promoção ou recusa

### Métricas

- lead time de promoção Ruptur/Omega -> State
- taxa de itens aceitos vs rejeitados
- taxa de conflitos detectados antes da promoção

---

## Fase 4 — inteligência operacional contínua

### Objetivo

Fechar o loop de melhoria contínua do Jarvis e dos seus pares.

### Entregas

- skill telemetry
- avaliação de perfis (`ops`, `vcfo`, `vcvo`, `eggs`, futuro `vops`)
- política de ativação estratégica/frágil
- freshness de RAG / Context7
- cobertura mínima de documentação e comentários
- restore points institucionais

### Métricas

- taxa de sucesso por perfil
- taxa de uso útil por skill
- freshness SLA de RAG
- `% de mudanças críticas com runbook/doc`
- readiness de restore point

---

## 4. Trilhas mestras

## Trilha A — sessões e lifecycle (`omega`)

- canonizar heartbeat
- formalizar stale / close
- autoencerramento auditável
- lineage entre sessões

## Trilha B — tronco operacional (`ruptur`)

- session bridge com Git e Projects
- skill runtime observável
- telemetria de perfil
- RAG/Context7 com freshness
- restore/rollback com trilha

## Trilha C — governança (`state`)

- intake com gate
- backlog institucional vivo
- decisões/débitos gerados de modo disciplinado
- formalização de pares, conselhos e novas camadas

## Trilha D — identidade (`alpha`)

- permanece estável
- só recebe mudanças quando houver decisão institucional de identidade

---

## 5. Unknown unknowns mais perigosos

1. **Automação ilusória** — parecer automático sem fechar o loop.  
2. **Telemetria sem semântica** — dados demais, verdade útil de menos.  
3. **Autoescrita canônica indevida** — runtime empurrando verdade volátil para o `state`.  
4. **Perfis proliferando sem accountability** — pares, conselhos e cargos surgindo sem governança.  
5. **Restore incompleto** — rollback de deploy existir, mas recovery institucional não existir.  
6. **RAG envelhecido invisivelmente** — contexto passa a mentir sem ninguém perceber.  

---

## 6. Ordem prática recomendada

1. fechar lifecycle do `omega`  
2. fechar bridge sessão ↔ Git ↔ board  
3. fechar telemetria unificada  
4. criar intake com gate para o `state`  
5. fechar freshness de RAG / Context7  
6. formalizar restore points e ativações frágeis  
7. só então expandir `pairs`, `vOps` e conselho/Matusas  

---

## 7. Definição de sucesso

O plano mestre estará realmente cumprido quando o ecossistema conseguir responder, sem improviso:

- qual sessão está viva
- o que ela fez
- com quais perfis/skills
- com qual custo
- com qual resultado
- o que foi promovido ao `state`
- o que ainda é débito
- como fechar, restaurar ou retomar o ciclo com segurança
