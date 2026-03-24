<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/jarvis-activation-menu.md
Não edite manualmente aqui sem promover no STATE.
-->

# Menu oficial de ativação do Jarvis

**Status:** proposta documentada
**Atualização:** 2026-03-23

---

## 1. Objetivo / Objective

Formalizar um **menu bilíngue (pt-BR e English)** que descreve como iniciar o Jarvis, quais comandos ele entende e quais features/skills entram imediatamente após o *Jarvis Start* / *Jarvis Iniciar*.

Esse menu deve ser replicado em cada surface oficial (WhatsApp, console do Ruptur, chat interno, CLI) para que a ativação responda com a mesma mensagem e a sessão receba as capacidades esperadas.

---

## 2. Trigger principal / Main trigger

- **Português:** `Jarvis Iniciar`
- **English:** `Jarvis Start`

### Overlay opcional de performance / Optional performance overlay

- **Português:** `Modo Full`
- **English:** `Full Mode`

Ao receber o trigger, o sistema realiza:
1. validação de self-chat (exigência atual das instâncias);
2. verificação de senha (`7`, `/7`, `jarvis 7`, `/jarvis 7`, `jarvis-7`, `/jarvis-7`);
3. atualização do metadata para `active_persona = "jarvis"`;
4. resposta imediata com o menu resumido abaixo;
5. registro da ativação no artefato da sessão (`sessions/*.json`).
6. em superfícies de chat acopladas ao `state`, reconciliação imediata com a sessão oficial ativa em `omega`/`ruptur` e materialização da ativação no `state`.

Ao receber `Modo Full` / `Full Mode`, o sistema:
1. preserva a sessão oficial já ativa;
2. sobe todas as capacidades baseline como exigíveis na rodada;
3. registra o uso do modo em `knowledge/` e em `knowledge/traces/trace-<session_id>.md`.

---

## 3. Menu apresentado ao usuário / Menu presented to user

### pt-BR
```
Jarvis ativo.
Capacidades agora disponíveis:
- maestro_orchestration (orquestração Maestro)
- multi_agent_debate_guided (debate multiagente guiado)
- profile_ops / vcfo / vcvo / eggs (perfís operacionais)
- state_capitalization_required (capitalização obrigatória)
- rag_context7_reference_required (contexto RAG/Context7)
- documentation_and_comment_coverage_required (cobertura documental)
- session_telemetry_basic (telemetria mínima)
- github_projects_backlog_linkage (ligação com GitHub Projects)

Comandos rápidos: `/session-status`, `/end-session`, `#reset-session`, `/performance-check <checkpoint>`
```

### pt-BR — resposta adicional para Modo Full
```
Modo Full ativo.
Todas as capacidades baseline da sessão agora estão exigíveis.
Este uso será registrado em knowledge + trace da sessão.
```

### English
```
Jarvis is now active.
Available capabilities:
- maestro_orchestration (Maestro orchestration)
- multi_agent_debate_guided
- profile_ops / vcfo / vcvo / eggs
- state_capitalization_required
- rag_context7_reference_required
- documentation_and_comment_coverage_required
- session_telemetry_basic
- github_projects_backlog_linkage

Quick commands: `/session-status`, `/end-session`, `#reset-session`, `/performance-check <checkpoint>`
```

### English — additional Full Mode response
```
Full Mode active.
All baseline session capabilities are now enforceable.
This usage will be recorded in the session knowledge + trace.
```

---

## 4. Lista de comandos oficiais / Official command list

| Comando | Descrição (pt-BR) | Description (EN) |
| --- | --- | --- |
| `Jarvis Start` / `Jarvis Iniciar` | ativa o Jarvis com base no trigger oficial | starts Jarvis with official trigger |
| `/jarvis` <senha> | ativa Jarvis exigindo senha; senha padrão `7` | activates Jarvis with password (default `7`) |
| `/session-status` | responde com status atual da sessão | responds with current session status |
| `/end-session`, `/stop`, `/stop-jarvis` | encerra a sessão e retorna para IAzinha | closes Jarvis session and returns to IAzinha |
| `#reset-session` | reinicia contexto (IAzinha por padrão) | resets session metadata (IAzinha default) |
| `/performance-check <checkpoint>` | registra checkpoint do playbook de performance | logs a performance review checkpoint |
| `/performance-check activation` | revisão inicial | activation review |
| `/performance-check risk` | revisão de risco ou priorização | risk/prioritization review |
| `/performance-check handoff` | antes de transferir para outro executor | pre-handoff review |
| `Modo Full` / `Full Mode` | ativa todas as capacidades baseline e exige registro auditável do uso | activates all baseline capabilities and requires auditable usage logging |

---

## 5. Features / Skills ativadas imediatamente / Features/skills unleashed

O menu também expõe **recursos de oportunidade** já usados em cases de sucesso e que respondem às demandas atuais:

1. **Telemetria básica + perfis (`profile_ops`, `profile_vcfo`, `profile_vcvo`, `profile_eggs`)** — replicam o baseline do `playbooks/jarvis.performance-default.md` e foram usados durante a ativação auditável deste turno; garantem rastreabilidade com `connectome/status.json`.
2. **Capitalização obrigatória (`state_capitalization_required`)** — caso já presente em entregas anteriores, garante que decisões relevantes gerem `state` updates.
3. **RAG/Context7 reference (`rag_context7_reference_required`)** — conecta o contexto ao repositório de conhecimento; amplamente usado em casos de clientes que exigem repeatability.
4. **Documentação e cobertura de comentários (`documentation_and_comment_coverage_required`)** — como nos runbooks e scripts existentes; evita débitos de governança.
5. **GitHub Projects linkage (`github_projects_backlog_linkage`)** — inspirações de cases de sucesso (ex: `ruptur.delivery os`) para manter backlog sincronizado com sessão.
6. **Session telemetry (`session_telemetry_basic`)** — complementa liveness guard e garante sinal de vida constante.
7. **Maestro orchestration & multi-agent debate** — já usados nas ativação de performance da sessão atual e no `connectome`/`lambda` runbook.

Esses recursos devem ser confirmados ao final da ativação, permanecendo ativos até nova revisão por comando `/performance-check`.

Quando o **Modo Full** for ativado, a sessão deve ainda registrar:

- nota de ativação em `knowledge/`
- trace em `knowledge/traces/trace-<session_id>.md`
- referência ao `playbooks/jarvis.full-mode.md`
- quando a ativação vier de chat surface acoplada ao `state`, seguir também `playbooks/jarvis.chat-surface-materialization.md`

---

## 6. Próximos passos sugeridos / Suggested next steps

1. **Incluir este menu em `knowledge/`** e replicar em `codex/ruptur/JARVIS.md` e `connectome/status.json` para manter dualidade.
2. **Criar snippet automatizado** no chat (texto acima) para ser enviado sempre que `Jarvis Start / Jarvis Iniciar` for reconhecido.
2.1 **Aplicar `AGENTS.md` + `playbooks/jarvis.chat-surface-materialization.md`** para que a materialização local vire comportamento padrão desta pasta.
3. **Registrar comando `/performance-check` no `omega/workflow`** e em `playbooks/jarvis.performance-default.md` como checklist auditável.
4. **Adotar o menu como base para futuras interfaces** (WhatsApp menus com `/send/menu`, CLI quick commands, etc.).
5. **Consultar os guias locais** de `knowledge/intake/README.md`, `knowledge/context7-governance.md` e `knowledge/projects-linkage.md` quando a rodada envolver promoção ao `state`, RAG/Context7 ou GitHub Projects.

---

## 7. Referências

- `codex/ruptur/backend/app/api/uazapi_webhook.py` (lista de comandos)
- `codex/ruptur/RAG/CONTEXT7.md` (cases e comandos já usados)
- `playbooks/jarvis.performance-default.md` (capabilities baseline)
- `playbooks/jarvis.handoff.md` + `knowledge/2026-03-23-plano-mestre-jarvis-autonomia.md` (estratégia de handoff e menu)
- `codex/ruptur/deploy/host2/baileys/src/index.mjs` (suporte a menus interativos)
