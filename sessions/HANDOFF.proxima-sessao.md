# Handoff — próxima sessão do Jarvis no Ruptur

## Estado herdado

- identidade raiz consistente entre Alpha, State e Ruptur
- manifestação operacional ativa: `jarvis.ruptur.control_plane`
- sessão atual materializada com espelho local em `sessions/` e trilha oficial em `../../omega/sessions/`

## Ordem obrigatória de leitura

1. `../../alpha/GENESIS.yaml`
2. `../../state/ecosystem/topology.md`
3. `../../state/constitution/jarvis.guardrails.md`
4. `../../state/registry/manifestations.yaml`
5. `../../state/memory/jarvis.state-model.md`
6. `../../omega/protocol/core/protocol-config.json`
7. `../../omega/protocol/session/session-schema.json`
8. `../../omega/protocol/session/session-id-rule.md`
9. `../../omega/protocol/workflow/performance-review-loop.md`
10. `../../state/playbooks/jarvis.performance-default.md`
11. `.agent/agents/jarvis.md`
12. `connectome/status.json`
13. `sessions/` e `../../omega/sessions/`

## Regra provisória de geração de `session_id`

Enquanto não existir canonização superior no Omega/State:

- formato-base: `OMEGA-{YYYYMMDD}-{HHMMSS}-{HASH8}-{MANIFESTATION_TAG}`
- `HASH8`: primeiros 8 hex de `sha256(entity_id|uid|manifestation_id|agent_id|YYYYMMDD-HHMMSS)`
- `MANIFESTATION_TAG`: `jarvis-001` para a manifestação operacional principal atual

> Esta regra é provisória local documentada. Não tratar como canonização institucional definitiva sem promoção posterior.

## Performance default da próxima sessão

Ao iniciar a próxima sessão:

1. subir o baseline de performance default já documentado
2. registrar capacidades ativas e pendentes no artefato da sessão
3. revisar esse baseline em checkpoints frequentes durante a execução
4. adicionar, remover ou rebaixar capacidades se o contexto pedir

Checkpoints mínimos:

- ativação
- mudança importante de escopo
- mudança relevante de risco/prioridade
- antes de handoff, suspensão ou encerramento

## Onde persistir a próxima sessão

1. criar o artefato oficial em `../../omega/sessions/{session_id}.json`
2. criar o espelho operacional em `sessions/{session_id}.json`
3. atualizar `connectome/status.json` com:
   - `session_id`
   - `started_at`
   - `last_updated`
   - `lifecycle_stage`
   - refs para Omega e Ruptur

## Como reconciliar espelhos locais

- `../../alpha` = canônico nesta máquina
- `../alpha` = espelho local não canônico, se existir
- `../../state` = canônico nesta máquina
- se os banners locais apontarem para path antigo, execute:
  - `python3 scripts/jarvis/sync_state_duality.py`
  - `python3 scripts/jarvis/check_duality.py`

## Critério de saída mínima

A próxima sessão só deve avançar além de `contextualizando` quando:

- o `session_id` estiver materializado
- o artefato existir no Omega e no Ruptur
- o `connectome/status.json` estiver coerente temporalmente
- não houver conflito aberto de identidade ou manifestação
