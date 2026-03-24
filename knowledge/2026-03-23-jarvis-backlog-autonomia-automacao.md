<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-23-jarvis-backlog-autonomia-automacao.md
Não edite manualmente aqui sem promover no STATE.
-->

# Backlog canônico — Jarvis / automação / autonomia / governança operacional

**Data:** 2026-03-23  
**Status:** backlog canônico inicial  
**Origem:** análise consolidada do ecossistema `alpha` / `state` / `omega` / `codex/ruptur`

---

## 1. Objetivo

Registrar, em trilha canônica, os gaps e oportunidades prioritárias para transformar o Jarvis em um sistema:

- mais autônomo
- mais rastreável
- mais automatizado
- mais observável
- mais seguro para operação contínua

---

## 2. Leitura executiva

O ecossistema já possui base real para:

- identidade raiz (`alpha`)
- governança institucional (`state`)
- lifecycle inicial de sessão (`omega`)
- manifestação operacional viva (`ruptur`)
- perfis operacionais (`ops`, `vcfo`, `vcvo`, `eggs`)
- skill runtime parcial
- workflows GitHub reais
- rollback/deploy reais

Mas ainda não possui, de ponta a ponta, uma malha fechada de:

- automação cross-layer
- telemetria unificada
- auto-incremento seguro do `state`
- bridge forte entre sessão, Git e backlog
- governança de pares/conselhos
- refresh contínuo de RAG / Context7
- restore points institucionais

---

## 3. Backlog priorizado

| ID | Prioridade | Tema | Repositório líder | Board recomendado | Resultado esperado |
|---|---|---|---|---|---|
| JARVIS-AUT-001 | P0 | Autoencerramento auditável de sessões inativas | `omega` | `JARVIS OMEGA - Protocolo Lifecycle Board` | sessões zumbis deixam de permanecer abertas; sessões em uso real não são encerradas |
| JARVIS-AUT-002 | P0 | Canonização cross-layer de `session_id`, heartbeat, stale e closure | `omega` | `JARVIS OMEGA - Protocolo Lifecycle Board` | lifecycle fica determinístico e auditável |
| JARVIS-AUT-003 | P0 | Bridge entre `session_id`, branch, commit, workflow run, issue e Git Project item | `codex/ruptur` | `Ruptur Delivery OS` | rastreabilidade técnica ponta a ponta |
| JARVIS-AUT-004 | P0 | Telemetria unificada do Jarvis, perfis, skills e sessões | `codex/ruptur` | `Ruptur Delivery OS` | decisões e execução passam a gerar evidência operacional estruturada |
| JARVIS-AUT-005 | P0 | Intake pipeline com gate para auto-incremento seguro do `state` | `state` | `Ruptur Delivery OS` | o `state` passa a receber promoção sugerida com reconciliação, sem autoescrita cega |
| JARVIS-AUT-006 | P1 | Refresh de RAG / Context7 / documentação executável | `codex/ruptur` | `Ruptur Delivery OS` | contexto operacional deixa de envelhecer silenciosamente |
| JARVIS-AUT-007 | P0 | Política institucional de backup, restore point e ativação estratégica/frágil | `codex/ruptur` + `omega` + `state` | `Ruptur Delivery OS` | ativações e recoveries deixam de depender de memória manual |
| JARVIS-AUT-008 | P1 | Formalização de `vOps`, `pairs` e eventual conselho/Matusas | `state` | `Ruptur Delivery OS` | expansão de papéis sem colapso ontológico |
| JARVIS-AUT-009 | P1 | Telemetria de eficácia por skill / perfil / tipo de missão | `codex/ruptur` | `Ruptur Delivery OS` | melhoria contínua deixa de ser só percepção subjetiva |
| JARVIS-AUT-010 | P1 | Cobertura mínima de documentação, comentários e trilha auditável para mudanças críticas | `state` + `codex/ruptur` | `Ruptur Delivery OS` | mudanças frágeis passam a sair com contexto e reversibilidade |
| JARVIS-AUT-011 | P0 | Taxonomia canônica dos perfis virtuais, aliases e regras de nomenclatura | `state` | `Ruptur Delivery OS` | elimina drift entre `vCVO`/`VisionCO`, `vCEO`/`Eggs` e futuras expansões |
| JARVIS-AUT-012 | P0 | Gate explícito de `não fazer`, falso positivo, bloqueio e aborto | `state` + `codex/ruptur` | `Ruptur Delivery OS` | o sistema aumenta a capacidade de negar e parar cedo com motivo auditável |
| JARVIS-AUT-013 | P0 | Pipeline de materialização pós-mesa para backlog, regra, runbook, trace e GitHub Projects | `state` + `codex/ruptur` | `Ruptur Delivery OS` | decisões deixam de morrer em conversa e passam a gerar artefato acionável |
| JARVIS-AUT-014 | P1 | Gatilhos automáticos com garantia de uso ativo | `state` + `codex/ruptur` | `Ruptur Delivery OS` | conhecimento acionado automaticamente só entra se tiver owner, métrica e trilha real de uso |
| JARVIS-AUT-015 | P0 | Formalização de `vController`, `vAdminOps` e `vFinOps` com taxonomia, gatilhos e runtime mínimo | `state` + `codex/ruptur` | `Ruptur Delivery OS` | frentes financeira/administrativa/finops passam a ter perfis canônicos, contrato de saída e acionamento |
| JARVIS-AUT-016 | P0 | Enforcement runtime da matriz de acionamento, `não fazer`, bloqueio, aborto e uso ativo | `state` + `codex/ruptur` | `Ruptur Delivery OS` | o runtime passa a auto-injetar guardrails e saídas mínimas com trilha de adoção |

---

## 4. Critérios de aceite resumidos por item

## JARVIS-AUT-001 — Autoencerramento auditável de sessões inativas

- `omega` passa a ter sinais formais de liveness
- existe janela de inatividade configurável
- existe estado intermediário (`stale` ou equivalente)
- sessões não ativas de verdade podem ser encerradas automaticamente
- sessões em uso real permanecem abertas

## JARVIS-AUT-002 — Canonização cross-layer do lifecycle

- `session_id` deixa de ser só formato e passa a ser contrato completo
- heartbeat / `last_activity_at` / `closed_at` entram no modelo
- `stale`, `suspenso`, `handoff_pendente` e `closure_reason` ficam formalizados
- artifacts do `omega` e do `ruptur` seguem a mesma semântica

## JARVIS-AUT-003 — Bridge sessão ↔ Git ↔ backlog

- toda sessão consegue apontar para branch, commits, workflow run e item de board
- é possível responder “qual sessão gerou esta mudança?”
- é possível responder “qual item do board originou esta sessão?”

## JARVIS-AUT-004 — Telemetria unificada

- sessão, perfil e skill passam a gerar eventos estruturados
- existe trilha para custo, resultado, bloqueio, risco e duração
- melhora contínua passa a ter base empírica

## JARVIS-AUT-005 — Auto-incremento seguro do `state`

- existe pipeline de intake
- promoção para o `state` é sugerida, validada e reconciliada
- o `state` não é reescrito automaticamente por runtime

## JARVIS-AUT-006 — RAG / Context7 / documentação executável

- fontes operacionais possuem freshness policy
- `CONTEXT7` deixa de envelhecer sem aviso
- docs críticas passam a ter trilha de atualização

## JARVIS-AUT-007 — Backup / restore / ativações frágeis

- existe restore point de sessão
- existe restore point institucional mínimo
- runbooks frágeis passam a exigir plano de retorno

## JARVIS-AUT-008 — vOps / pairs / conselhos

- `vOps` é formalizado ou explicitamente descartado
- `pairs` só nasce com base factual
- conselhos/Matusas só entram com autoridade, escopo e responsabilidade definidos

## JARVIS-AUT-009 — Skill telemetry

- performance por skill e por perfil pode ser medida
- fica possível saber o que ajuda, o que atrapalha e o que deve ser aposentado

## JARVIS-AUT-010 — Doc/comment coverage

- mudanças críticas exigem comentário, runbook ou doc vinculada
- ativações frágeis saem com reversão clara

## JARVIS-AUT-011 — Taxonomia canônica dos perfis virtuais

- existe regra formal para nomes canônicos e aliases
- backlog, governança e projetos usam o nome canônico
- expansão de perfis passa a exigir owner, trigger, runbook e métrica

## JARVIS-AUT-012 — Gate de `não fazer` / falso positivo

- toda execução relevante explicita caminhos proibidos
- existe distinção operacional clara entre `bloqueado` e `abortado`
- o custo de erro entra na decisão antes da ação

## JARVIS-AUT-013 — Materialização pós-mesa

- saída de mesa sempre gera backlog, regra, runbook, ADR, trace ou project item
- existe checklist de fechamento para impedir perda de decisão
- fica rastreável o vínculo entre conversa, artefato e execução

## JARVIS-AUT-014 — Gatilhos com uso ativo garantido

- nenhum gatilho entra como ativo sem owner, métrica, rollback e condição de desligamento
- gatilhos passam a registrar trilha mínima de uso
- fica visível o que foi acionado automaticamente e com qual efeito

## JARVIS-AUT-015 — Formalização de vController / vAdminOps / vFinOps

- existe taxonomia canônica para os três perfis
- cada perfil tem gatilho, owner, objetivo e saída mínima obrigatória
- `state` e `ruptur` deixam claro quando usar cada perfil
- aliases legados não substituem os nomes canônicos

## JARVIS-AUT-016 — Enforcement runtime da matriz de acionamento / no-go

- o runtime injeta contexto mínimo de governança quando detectar gatilhos
- respostas de perfis críticos passam a explicitar caminho recomendado, caminho proibido, bloqueio, aborto e evidência faltante
- existe trilha mínima de uso ativo para a auto-injeção
- o enforcement preserva qualidade, velocidade e capacidade de negar

---

## 5. Riscos que este backlog tenta reduzir

- sessões zumbis
- governança contaminada por verdade volátil
- falta de rastreabilidade entre sessão e Git
- skills sendo usadas sem feedback mensurável
- RAG envelhecendo sem controle
- restore points inexistentes
- perfis e pares surgindo sem ontologia nem accountability

---

## 6. Observação de governança

Este backlog deve ser tratado como:

- backlog de consolidação institucional no `state`
- backlog operacional/tronco no `ruptur`
- backlog de lifecycle no `omega`

O `alpha` participa como âncora de identidade, não como superfície de automação.

---

## 7. Publicação em GitHub Projects

Em 2026-03-23, os itens deste backlog foram publicados nos boards ativos do ecossistema:

| ID | Board | Project Item ID |
|---|---|---|
| JARVIS-AUT-001 | `JARVIS OMEGA - Protocolo Lifecycle Board` | `PVTI_lAHODOO6r84BSQulzgoDflg` |
| JARVIS-AUT-002 | `JARVIS OMEGA - Protocolo Lifecycle Board` | `PVTI_lAHODOO6r84BSQulzgoDflo` |
| JARVIS-AUT-003 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoDfl4` |
| JARVIS-AUT-004 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoDfl8` |
| JARVIS-AUT-005 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoDfmg` |
| JARVIS-AUT-006 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoDfm4` |
| JARVIS-AUT-007 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoDfnI` |
| JARVIS-AUT-008 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoDfnY` |
| JARVIS-AUT-009 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoDfnw` |
| JARVIS-AUT-010 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoDfoI` |
| JARVIS-AUT-011 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoMv4Y` |
| JARVIS-AUT-012 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoMv4g` |
| JARVIS-AUT-013 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoMv40` |
| JARVIS-AUT-014 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoMv48` |
| JARVIS-AUT-015 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoNTTM` |
| JARVIS-AUT-016 | `Ruptur Delivery OS` | `PVTI_lAHODOO6r84BRgVSzgoNTTc` |

Critério aplicado na publicação:

- `Status = Todo` para todos os itens recém-publicados
- classificação econômica aplicada no `Ruptur Delivery OS` conforme o tipo de débito/oportunidade
- backlog institucional continua canônico no `state`; os boards são espelhos operacionais de execução e priorização

---

## 8. Débitos de reconciliação derivados da fotografia local de 2026-03-23

| ID | Prioridade | Tema | Repositório líder | Resultado esperado |
|---|---|---|---|---|
| JARVIS-REC-011 | P1 | Reconciliar `constitution/ruptur.sources-and-queries.md` com o modelo Alpha / State / Omega / Ruptur | `state` | remover regra de consulta desatualizada |
| JARVIS-REC-012 | P1 | Atualizar `contexts/ruptur.md` do modelo bifásico para o quadrifásico | `state` | contexto do Ruptur deixa de carregar ontologia antiga |
| JARVIS-REC-013 | P1 | Ajustar `registry/repositories.yaml` para não deixar margem de leitura do `state` como dono da identidade raiz | `state` | responsabilidade de identidade volta a ficar inequívoca no `alpha` |
| JARVIS-REC-014 | P1 | Atualizar `knowledge/ruptur.activation-debts.md` removendo débitos já resolvidos e destacando apenas os ativos | `state` | dívida de ativação deixa de mentir por desatualização |
| JARVIS-REC-015 | P1 | Fechar assimetria semântica entre o artefato de sessão do `omega` e o espelho do `ruptur` | `omega` + `codex/ruptur` | deliverables e status de espelhamento passam a falar a mesma língua |
| JARVIS-REC-016 | P1 | Explicitar responsável por manifestação em `registry/manifestations.yaml` | `state` | cada manifestação passa a carregar ownership institucional explícito |
| JARVIS-REC-017 | P1 | Tratar placeholders canônicos zero-byte com conteúdo mínimo ou classificação formal de placeholder | `state` | corpus canônico deixa de ter zonas silenciosas sem semântica |
| JARVIS-REC-018 | P2 | Criar matriz canônica única `atributo -> valor -> camada dona -> evidência -> grau de consolidação` | `state` | auditoria futura do Jarvis fica mais rápida e menos ambígua |

Fonte de origem destes itens:

- `knowledge/2026-03-23-fotografia-jarvis-manifestacao-local.md`

---

## 9. Andamento atual

### JARVIS-AUT-001 — em progresso com fase 1 entregue

Referência detalhada:

- `knowledge/2026-03-23-aut001-liveness-phase1.md`

Situação atual:

- policy e script inicial de liveness entregues no `omega`
- sessão ativa protegida contra fechamento indevido
- sincronização mínima de liveness entregue no `ruptur`
- card movido para `In Progress`
- merge final do `omega` ainda depende da PR aberta

### JARVIS-AUT-001 — fase 2 em curso

Referência:

- `knowledge/2026-03-23-aut001-gate.md`

Itens previstos:

- gate controlado `stale -> closed` com revisão manual dos relatórios
- runner periódico já gerando relatórios `report_only`
- testes/validação com sessão simulada antes de aplicar
- harmonização final semântica com o espelho do `ruptur`

### JARVIS-AUT-005 — fundação documental entregue no STATE

Referências:

- `playbooks/jarvis.intake-gate.md`
- `knowledge/trace-grading.md`
- `templates/jarvis.trace-card.md`
- `knowledge/traces/README.md`

Situação atual:

- gate documental de promoção materializado
- scorecard e template de trace disponíveis
- automação de intake, inbox e reconciliação assistida continuam pendentes

### JARVIS-REC-017 — fechado nesta rodada documental

Situação atual:

- placeholders canônicos zero-byte foram tratados com conteúdo mínimo ou placeholder formal
- arquivos deslocados para `state/` interno foram reconciliados nos caminhos canônicos do repositório
- o corpus deixa de ter zonas silenciosas sem semântica
