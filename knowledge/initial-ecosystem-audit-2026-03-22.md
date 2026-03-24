<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/initial-ecosystem-audit-2026-03-22.md
Não edite manualmente aqui sem promover no STATE.
-->

# Auditoria inicial do ecossistema TiatendeAI — 2026-03-22

## Status

Diagnóstico inicial concluído.  
Nenhuma mudança estrutural foi aplicada nos repositórios operacionais nesta rodada.

---

## Escopo auditado

### Camada canônica

- `state`

### Tronco operacional

- `codex/ruptur`

### Biblioteca complementar de prompts e padrões

- `ruptur-prompts`

### Satélites ativos ou relevantes encontrados no workspace

- `tiatendeai-business-boost`
- `happy-client-messager`
- `vps-oracle`
- `codex/sdr`

---

## Leitura macro

O `STATE` já nasceu com a intenção correta, mas ainda está em estágio de **semente**.

Hoje, a maior parte da verdade operacional ainda está distribuída em:

- `codex/ruptur` para execução, runbooks, RAG e operação do Jarvis
- `tiatendeai-business-boost` para a frente viva de warmup e entrega controlada
- `happy-client-messager` como ancestral operacional com alto risco de drift e sensibilidade
- `vps-oracle` como satélite de infraestrutura
- `ruptur-prompts` como laboratório de R&D de prompts, multiagentes e patterns

Conclusão: **o STATE já é o destino correto, mas ainda não é o consolidado factual do ecossistema**.

---

## Evidências principais observadas

### STATE

- O repositório contém apenas 5 arquivos úteis no momento:
  - `README.md`
  - `index.yaml`
  - `contexts/ruptur.md`
  - `ecosystem/topology.md`
  - `playbooks/multi-agent-debate.md`
- Porém, na auditoria desta data, apenas `README.md` e `index.yaml` estavam de fato versionados em Git.
- Os conteúdos de `contexts/`, `ecosystem/` e `playbooks/` existiam localmente, mas ainda não estavam rastreados.
- Diretórios estratégicos continuam vazios:
  - `decisions/`
  - `patterns/`
  - `memory/`
  - `knowledge/` (antes deste registro)
  - `registry/`
  - `templates/`

### RUPTUR

- É o repositório com maior densidade operacional auditável nesta rodada.
- `connectome/status.json` foi atualizado por último em `2026-03-20T18:16:00-03:00`.
- `RAG/CONTEXT7.md` está datado como fonte operacional de `2026-03-15`, com validações adicionais em `2026-03-16`.
- Há mudanças locais pendentes e drift de branch em `snapshot/local-2026-03-20-pre-cleanup`.

### PROMPTS / MAESTRO / DEBATE

- `ruptur-prompts` funciona como laboratório e biblioteca complementar, não como produção.
- Há material útil em:
  - `MULTIAGENTES EM DEBATE/`
  - `sandeco-maestro/`
  - `SandeClaw/specs/`

### Satélites

- `tiatendeai-business-boost` está em modo de oficina ativa com trilha operacional forte.
- `happy-client-messager` existe tanto como repositório próprio quanto como submódulo dentro de `codex/ruptur`.
- `vps-oracle` segue relevante como referência de topologia, acesso e observabilidade.
- `codex/sdr` segue útil como satélite de playbooks comerciais e motion de agentes.

---

## Classificação atual do ecossistema

### 1. Camada canônica

- `state`
- Papel: governança, contexto, memória, capital intelectual
- Situação: correta em intenção, insuficiente em cobertura

### 2. Tronco de execução

- `codex/ruptur`
- Papel: implementação, operação, runbooks, RAG, Jarvis, deploy, backend, web
- Situação: maior fonte de verdade operacional hoje

### 3. Laboratório / R&D

- `ruptur-prompts`
- Papel: prompts, debate multiagente, patterns e experimentos de orquestração
- Situação: fonte de hipótese e repertório, não de verdade operacional

### 4. Satélite ativo em integração

- `tiatendeai-business-boost`
- Papel: oficina do Warmup Manager e integração com Ruptur
- Situação: ativo, útil, parcialmente convergente para o tronco

### 5. Satélite legado com extração seletiva

- `happy-client-messager`
- Papel: ancestral operacional de canais, dispatcher, warmup e healthscore
- Situação: importante para arqueologia e reaproveitamento, com risco alto de drift e dados sensíveis

### 6. Satélite de infraestrutura

- `vps-oracle`
- Papel: provisionamento, acesso, observabilidade e topologia
- Situação: referência útil, não deve competir com o tronco

### 7. Satélite de playbooks comerciais

- `codex/sdr`
- Papel: workflows, motion comercial, jornadas e agentes de referência
- Situação: apoio de produto e operação, não fonte operacional primária

---

## Achados prioritários

## A1. O STATE está subdimensionado frente ao ecossistema real

O `STATE` ainda não espelha a complexidade e a distribuição real do ecossistema.

Faltam, no mínimo:

- registro estruturado de repositórios
- contextos por satélite
- decisões arquiteturais formais
- padrões de orquestração harmonizados
- trilha de riscos e conflitos

## A2. O RUPTUR está carregando governança demais dentro da própria camada de execução

Hoje, o `codex/ruptur` concentra:

- governança operacional
- runbooks
- portfolio de ativos
- RAG operacional
- conectome
- trilha viva de execução

Isso funciona operacionalmente, mas enfraquece a função do `STATE` como camada canônica.

## A3. Há drift documental e estrutural dentro do tronco operacional

Foram encontrados conflitos e sinais de consolidação incompleta:

- merge conflicts ainda presentes em:
  - `README.md`
  - `backend/docker-compose.yml`
  - `backend/README.md`
  - `backend/db/schema.sql`
  - `docs/blueprint/ruptur-blueprint.md`
  - `docs/jornada/proximos_passos_fase1.md`
- referências legadas para `/Users/diego/Downloads/...` em múltiplos documentos

## A4. Há drift de topologia e de source of truth operacional

Exemplo claro:

- `docs/governanca/ativos/registry.yaml` aponta:
  - `repository_root: /Users/diego/Downloads/ruptur`
  - `app.ruptur.cloud` em `host1`
- `docs/governanca/runbooks/runbook-host2-app-api.md` trata `app` e `api` como operação de `host2`
- `tiatendeai-business-boost/INTEGRATION_PLAN.md` coloca o warmup em `https://app.ruptur.cloud/warmup` dentro da stack `deploy/host2`

Leitura: a topologia registrada não está totalmente reconciliada.

## A5. Há duplicação de ativos e risco de espelho divergente

`happy-client-messager` aparece:

- como repositório próprio
- como submódulo em `codex/ruptur/happy-client-messager`

Sem política explícita no `STATE`, isso tende a gerar:

- drift silencioso
- dúvida de responsabilidade
- arqueologia confusa

## A6. Há risco alto de segurança e governança de dados

Foram identificados sinais críticos:

- `happy-client-messager/.env` rastreado em Git
- `happy-client-messager/MASTER_PROJECT_BLUEPRINT.md` com material sensível
- `codex/ruptur/oracle_db_dump.sql` rastreado em Git

Conclusão: existe risco real de exposição de segredos e/ou dados operacionais sensíveis no ecossistema.

## A7. A orquestração multiagente está fragmentada em padrões paralelos

Hoje coexistem, sem harmonização formal:

- `playbooks/multi-agent-debate.md`
- `ruptur-prompts/MULTIAGENTES EM DEBATE/*`
- `ruptur-prompts/sandeco-maestro/*`
- `codex/ruptur/docs/governanca/processos/orquestracao-a2a.md`
- `tiatendeai-business-boost/OPS_EXECUTION_LANES.md`

Leitura:

- existe riqueza de padrão
- falta taxonomia comum
- falta definir quando usar:
  - debate
  - lanes
  - orchestrator por trilha
  - maestro com travas e gatekeeping

## A8. O STATE já promoveu padrões sem lastro suficiente de validação

Exemplo: `playbooks/multi-agent-debate.md` está marcado como **"Validado e Ativo"**, mas ainda não há:

- ADR correspondente
- critérios formais de uso
- métricas de custo/benefício
- limites operacionais claros

Leitura: o conteúdo é útil, mas a governança de promoção ainda está frouxa.

---

## Diagnóstico consolidado

O ecossistema TiatendeAI já possui massa crítica de operação, documentação, padrões e memória.

O problema principal neste momento não é falta de material.  
O problema principal é **dispersão de autoridade, drift entre repositórios e promoção prematura de conhecimento sem trilha canônica suficiente**.

Em termos práticos:

- o `STATE` ainda não governa de fato
- o `RUPTUR` governa por gravidade operacional
- os satélites ainda vazam verdade operacional para fora do centro

---

## Prioridades recomendadas para a próxima onda

### P0 — consolidar o canônico

1. Formalizar o inventário de repositórios e papéis no `STATE`
2. Criar contextos dos satélites relevantes
3. Registrar conflitos e riscos conhecidos
4. Definir fronteiras entre:
   - governança canônica
   - execução
   - laboratório
   - legado

### P1 — reconciliar padrões e decisões

1. Criar ADRs para:
   - hierarquia real de verdade
   - política de satélites
   - política de promoção de patterns/playbooks
   - taxonomia de orquestração multiagente
2. Reclassificar artefatos de `ruptur-prompts` antes de promovê-los

### P2 — remediar os repositórios operacionais

1. Resolver merge conflicts no `Ruptur`
2. Corrigir referências legadas de caminhos locais
3. Reconciliar topologia host1/host2/app/api/warmup
4. Tratar risco de segredos e dumps rastreados

---

## Arquivos-base usados nesta auditoria

- `state/README.md`
- `state/index.yaml`
- `state/contexts/ruptur.md`
- `state/ecosystem/topology.md`
- `playbooks/multi-agent-debate.md`
- `codex/ruptur/JARVIS.md`
- `codex/ruptur/.agent/ARCHITECTURE.md`
- `codex/ruptur/.agent/agents/jarvis.md`
- `codex/ruptur/connectome/status.json`
- `codex/ruptur/RAG/CONTEXT7.md`
- `codex/ruptur/docs/governanca/README.md`
- `codex/ruptur/docs/governanca/processos/orquestracao-a2a.md`
- `codex/ruptur/docs/governanca/runbooks/runbook-jarvis-vc-level.md`
- `codex/ruptur/docs/governanca/runbooks/runbook-host2-app-api.md`
- `codex/ruptur/docs/governanca/ativos/registry.yaml`
- `codex/ruptur/docs/governanca/portfolio/*`
- `codex/ruptur/docs/jornada/consolidacao-mestra-2026-03-12.md`
- `ruptur-prompts/MULTIAGENTES EM DEBATE/*`
- `ruptur-prompts/sandeco-maestro/*`
- `ruptur-prompts/SandeClaw/specs/*`
- `tiatendeai-business-boost/INTEGRATION_PLAN.md`
- `tiatendeai-business-boost/OPS_EXECUTION_LANES.md`
- `tiatendeai-business-boost/WARMUP_DELIVERY_THREAD.md`
- `tiatendeai-business-boost/RAG/CONTEXT7.md`
- `happy-client-messager/MASTER_PROJECT_BLUEPRINT.md`
- `vps-oracle/docs/access_guide.md`
- `vps-oracle/docs/observabilidade_kvm2_matriz_why.md`
- `codex/sdr/crm-ia-real-estate.md`

---

## Fechamento

O `STATE` deve continuar como destino da consolidação.  
Mas, até esta data, `2026-03-22`, ele ainda precisa absorver a cartografia real do ecossistema para se tornar de fato a camada canônica operacional.
