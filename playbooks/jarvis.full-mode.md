<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.full-mode.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook — Modo Full do Jarvis

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Objetivo

Definir o que significa ativar o **Modo Full** do Jarvis de forma auditável, sem inventar capacidades fora do que já existe materialmente no ecossistema.

---

## Definição

Modo Full = sessão com todas as capacidades baseline abaixo tratadas como **ativas e exigíveis ao mesmo tempo**, com uso explícito e registro obrigatório:

- `maestro_orchestration`
- `multi_agent_debate_guided`
- `profile_ops`
- `profile_vcfo`
- `profile_vcvo`
- `profile_eggs`
- `state_capitalization_required`
- `rag_context7_reference_required`
- `documentation_and_comment_coverage_required`
- `session_telemetry_basic`
- `github_projects_backlog_linkage`

---

## Pré-condições

- `session_id` oficial materializado
- fonte de verdade da tarefa identificada
- revisão inicial de performance executada
- operador com autoridade explícita para ativar o modo

---

## Protocolo mínimo de uso

### 1. Maestro

Organizar a rodada com plano explícito, ordem de execução e critério de validação.

### 2. Debate guiado

Executar leitura multi-lente, no mínimo, pelos perfis:

- `ops`
- `vcfo`
- `vcvo`
- `eggs`

O debate pode ser feito por subagentes ou por framework estruturado na própria sessão, desde que o registro fique visível.

### 3. Referência de contexto

Consultar o corpus canônico, o backlog e o contexto operacional pertinente antes de concluir a execução.

Quando a rodada tocar promoção ao `state`, Context7/RAG ou GitHub Projects, consultar também:

- `knowledge/intake/README.md`
- `knowledge/context7-governance.md`
- `knowledge/projects-linkage.md`

### 4. Capitalização

Toda diretriz durável, decisão operacional, ativação de modo ou débito real precisa deixar rastro no STATE.

### 5. Telemetria

Registrar, no mínimo:

- `session_id`
- timestamp de ativação
- operador
- modo ativo
- capacidades ativas
- artefatos tocados

### 6. Linkage

Relacionar a ativação com backlog, board ou item institucional sempre que existir referência disponível.

---

## Registro obrigatório quando ativado

Ao ativar Modo Full, a sessão deve produzir:

1. nota de ativação em `knowledge/`
2. trace em `knowledge/traces/trace-<session_id>.md`
3. referência no playbook ou menu quando a semântica do modo evoluir

---

## Regra de prudência

Modo Full **não** autoriza:

- fingir automação inexistente
- tratar intenção como capacidade material
- pular gate de capitalização
- executar ação sensível sem autoridade explícita

Se alguma capacidade não puder ser usada de verdade, ela deve ser rebaixada e o motivo precisa ser registrado.
