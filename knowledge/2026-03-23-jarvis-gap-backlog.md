<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-23-jarvis-gap-backlog.md
Não edite manualmente aqui sem promover no STATE.
-->

# Backlog Complementar — Gaps de maturidade do Jarvis

**Data:** 2026-03-23  
**Status:** planejado  
**Origem:** Análise das lacunas entre o ecossistema atual e práticas maduras de agentes (trace grading, IAM, observabilidade).

---

## 1. Tabela de gaps + responsáveis

| ID | Gap | Responsável | Local sugerido | Observação |
| --- | --- | --- | --- | --- |
| JARVIS-GL-001 | Documentar carta, DNA e linhagem (identidade canônica) | State (governança) | `state/constitution/` | Materializado em `constitution/jarvis.charter.md`, `constitution/jarvis.dna.md` e `constitution/jarvis.lineage.md`. |
| JARVIS-GL-002 | Sincronizar textos institucionais com modelo Alpha/State/Omega/Ruptur | State (documental) | `state/contexts/`, `state/registry/` | Ajuste em `contexts/ruptur.md` e `registry/repositories.yaml` para eliminar drift. |
| JARVIS-GL-003 | Pipeline oficial de heartbeat, stale e autoencerramento | Omega | `omega/protocol/` + scripts | Vincular `session_liveness_guard.py` e registrar artefato `omega_session_artifact`. |
| JARVIS-GL-004 | Bridge sessão ↔ Git ↔ workflow ↔ issue/project | Ruptur | `codex/ruptur/docs/governanca/session-git-bridge.md` | Automação registrando session_id nos commits e projetos. |
| JARVIS-GL-005 | Telemetria unificada e skill telemetry | Ruptur + State | `codex/ruptur/telemetry/`, `state/knowledge/` | Pipeline deve alimentar `session_telemetry_basic` e `skill_telemetry_full` do backlog. |
| JARVIS-GL-006 | Gate de intake para promoção ao STATE | State | `state/playbooks/jarvis.intake-gate.md` | Playbook materializado em `playbooks/jarvis.intake-gate.md` com checklist + trace grading. |
| JARVIS-GL-007 | Trace grading e evals contínuos | State + Ruptur | `state/knowledge/trace-grading.md`, `codex/ruptur/docs/governanca/evals/` | Guia interno e template materializados no STATE; integração com evals do Ruptur ainda pendente. |
| JARVIS-GL-008 | Arquitetura de memória em tiers com ACL | State + Ruptur | `state/memory/` + `codex/ruptur/connectome/` | Lado STATE materializado em `memory/jarvis.memory-tiers.md`; falta enforcement operacional no Ruptur. |
| JARVIS-GL-009 | Least-privilege por perfis e ferramentas | Ruptur (segurança) | `codex/ruptur/.agent/` + `docs/governanca/security/` | Atualizar `.agent/agents/jarvis.md` com matrix de acesso e link com supervision.yaml. |
| JARVIS-GL-010 | Model portfolio strategy e roteamento de modelos | State + Ruptur | `state/knowledge/`, `codex/ruptur/docs/governanca/model-portfolio.md` | Lado STATE materializado em `knowledge/model-portfolio-strategy.md`; Ruptur ainda precisa do documento operacional. |

---

## 2. Próximos passos coordenados
1. Criar/atualizar cada artefato acima com base no responsável e registrar a conclusão no backlog principal (`state/knowledge/2026-03-23-jarvis-backlog-autonomia-automacao.md`).  
2. Usar os trace cards do playbook `jarvis.intake-gate.md` para capturar métricas e evidências em cada promoção.  
3. Atualizar o registry de manifestações com campo `responsible` (já feito para `jarvis.canonical` e `jarvis.ruptur.control_plane`).  
4. Incluir os templates de trace grading e gate nos workflows de revisão de performance (`state/playbooks/jarvis.performance-default.md` e `omega/protocol/workflow/performance-review-loop.md`).  

---

## 3. Referências cruzadas
- `state/knowledge/2026-03-23-jarvis-performance-activation-current-session.md` (baseline de capacidades).  
- `state/knowledge/2026-03-23-jarvis-backlog-autonomia-automacao.md` (backlog original).  
- `state/playbooks/jarvis.performance-default.md` (perfil e revisões).  
- Documentos externos citados no playbook `jarvis.intake-gate.md`.
