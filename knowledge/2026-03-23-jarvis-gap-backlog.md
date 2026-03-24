<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-23-jarvis-gap-backlog.md
Não edite manualmente aqui sem promover no STATE.
-->

# Backlog Complementar — Gaps de maturidade do Jarvis

**Data:** 2026-03-23  
**Status:** planejado com itens materializados localmente  
**Origem:** Análise das lacunas entre o ecossistema atual e práticas maduras de agentes (trace grading, IAM, observabilidade).

---

## 1. Tabela de gaps + responsáveis

| ID | Gap | Responsável | Local sugerido | Observação |
| --- | --- | --- | --- | --- |
| JARVIS-GL-001 | Documentar carta, DNA e linhagem (identidade canônica) | State (governança) | `constitution/` | Materializado localmente em `constitution/jarvis.charter.md`, `constitution/jarvis.dna.md` e `constitution/jarvis.lineage.md`; consolidação em Git ainda faz parte desta rodada. |
| JARVIS-GL-002 | Sincronizar textos institucionais com modelo Alpha/State/Omega/Ruptur | State (documental) | `contexts/`, `registry/` | Ajustes locais em andamento para eliminar drift em `contexts/ruptur.md` e `registry/repositories.yaml`. |
| JARVIS-GL-003 | Pipeline oficial de heartbeat, stale e autoencerramento | Omega | `omega/protocol/` + scripts | Vincular `session_liveness_guard.py` e registrar artefato `omega_session_artifact`. |
| JARVIS-GL-004 | Bridge sessão ↔ Git ↔ workflow ↔ issue/project | Ruptur | `codex/ruptur/docs/governanca/session-git-bridge.md` | Documento operacional materializado; automação ponta a ponta ainda permanece em aberto. |
| JARVIS-GL-005 | Telemetria unificada e skill telemetry | Ruptur + State | `codex/ruptur/telemetry/`, `knowledge/` | Diretriz documental materializada no STATE e em `codex/ruptur/docs/governanca/telemetry/session-skill-telemetry.md`; pipeline ainda está pendente. |
| JARVIS-GL-006 | Gate de intake para promoção ao STATE | State | `playbooks/jarvis.intake-gate.md` | Playbook materializado localmente com checklist + trace grading; consolidação canônica depende do fechamento desta rodada. |
| JARVIS-GL-007 | Trace grading e evals contínuos | State + Ruptur | `knowledge/trace-grading.md`, `codex/ruptur/docs/governanca/evals/` | Materializado no STATE e no Ruptur (`docs/governanca/evals/trace-grading.md`); ainda falta automação/evals contínuos. |
| JARVIS-GL-008 | Arquitetura de memória em tiers com ACL | State + Ruptur | `memory/` + `codex/ruptur/connectome/` | Lado STATE materializado em `memory/jarvis.memory-tiers.md`; falta enforcement operacional no Ruptur. |
| JARVIS-GL-009 | Least-privilege por perfis e ferramentas | Ruptur (segurança) | `codex/ruptur/.agent/` + `docs/governanca/security/` | Matriz documental materializada em `docs/governanca/security/least-privilege-matrix.md` e referência adicionada em `.agent/agents/jarvis.md`; enforcement operacional ainda é próximo passo. |
| JARVIS-GL-010 | Model portfolio strategy e roteamento de modelos | State + Ruptur | `knowledge/`, `codex/ruptur/docs/governanca/model-portfolio.md` | Materializado no STATE e no Ruptur (`docs/governanca/model-portfolio.md`); binding/runtime seguem revisáveis. |

---

## 2. Próximos passos coordenados
1. Criar/atualizar cada artefato acima com base no responsável e registrar a conclusão no backlog principal (`knowledge/2026-03-23-jarvis-backlog-autonomia-automacao.md`).  
2. Usar os trace cards do playbook `jarvis.intake-gate.md` para capturar métricas e evidências em cada promoção.  
3. Atualizar o registry de manifestações com campo `responsible` (já feito para `jarvis.canonical` e `jarvis.ruptur.control_plane`).  
4. Incluir os templates de trace grading e gate nos workflows de revisão de performance (`playbooks/jarvis.performance-default.md` e `omega/protocol/workflow/performance-review-loop.md`).  

---

## 3. Referências cruzadas
- `knowledge/2026-03-23-jarvis-performance-activation-current-session.md` (baseline de capacidades).  
- `knowledge/2026-03-23-jarvis-backlog-autonomia-automacao.md` (backlog original).  
- `playbooks/jarvis.performance-default.md` (perfil e revisões).  
- Documentos externos citados no playbook `jarvis.intake-gate.md`.
---

## 4. Status após propagação desta rodada

Materializados nesta rodada:

- `JARVIS-GL-001` no `state`
- `JARVIS-GL-004` como documento operacional no Ruptur
- `JARVIS-GL-005` como diretriz documental em `state` + Ruptur
- `JARVIS-GL-006` no `state`
- `JARVIS-GL-007` no `state` + Ruptur
- `JARVIS-GL-008` no `state`
- `JARVIS-GL-009` como matriz documental + referência operacional no Ruptur
- `JARVIS-GL-010` no `state` + Ruptur
- integração do `omega/protocol/workflow/performance-review-loop.md` com intake + trace grading

Ainda dependem de implementação mais profunda ou automação real:

- `JARVIS-GL-003`
- automação ponta a ponta de `JARVIS-GL-004`
- pipeline de `JARVIS-GL-005`
- enforcement operacional de `JARVIS-GL-008` e `JARVIS-GL-009`
