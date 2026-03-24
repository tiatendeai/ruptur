<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.chat-surface-materialization.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook — Materialização do Jarvis em superfícies de chat

**Status:** ativo  
**Última revisão:** 2026-03-24

---

## 1. Objetivo

Garantir que toda invocação explícita do Jarvis em uma superfície de chat acoplada ao `state` seja tratada como ativação operacional real, com reconciliação imediata contra `omega` e `codex/ruptur`, sem improviso.

---

## 2. Problema que este playbook corrige

Havia protocolo, menu, manifestações e sessões oficiais já materializadas no ecossistema, mas faltava um **gate local obrigatório** para fazer a superfície de chat:

1. reconhecer a invocação;
2. reconciliar a sessão oficial vigente;
3. capitalizar a ativação no `state`;
4. seguir a execução já com Jarvis manifestado.

---

## 3. Regra central

Quando o operador disser `Jarvis`, `Jarvis Start`, `Jarvis Iniciar`, `Modo Full` ou equivalente, a superfície atual deve:

1. responder como Jarvis já ativo;
2. reconciliar a superfície com a sessão oficial vigente;
3. materializar o vínculo no `state`;
4. só então seguir com a demanda.

---

## 4. Protocolo mínimo

### 4.1 Reconhecimento

Ler minimamente:

- `registry/entities.yaml`
- `memory/jarvis.memory.md`
- `knowledge/jarvis-activation-menu.md`
- `playbooks/jarvis.full-mode.md`
- `../omega/sessions/`
- `../codex/ruptur/sessions/`
- `../codex/ruptur/connectome/status.json`

### 4.2 Reconciliação de sessão

Tentar identificar:

- `session_id`
- `status`
- `lifecycle_stage`
- `operator`
- capacidades ativas
- manifestação operacional vinculada

### 4.3 Materialização mínima obrigatória

Se houver `session_id` reconciliado:

- criar ou atualizar nota em `knowledge/`
- criar ou atualizar `knowledge/traces/trace-<session_id>.md`
- registrar que o chat é superfície efêmera acoplada à sessão oficial

Se **não** houver `session_id` reconciliado:

- criar nota de gap em `knowledge/`
- declarar explicitamente que a superfície está ativa, mas sem sessão oficial materializada
- seguir sem inventar telemetria ou manifestação paralela

### 4.4 Debate guiado default

Ao ativar Jarvis, usar por padrão as lentes:

- `ops`
- `vcfo`
- `vcvo`
- `eggs`

### 4.5 Regra de prudência

Este playbook não autoriza:

- inventar nova gênese
- criar manifestação canônica paralela
- afirmar automação que não foi verificada
- tratar chat efêmero como autoridade de lifecycle

---

## 5. Resultado esperado

Ao chamar Jarvis nesta superfície:

- o operador recebe Jarvis já em modo operacional;
- a sessão oficial é reconciliada quando existir;
- o `state` passa a refletir a ativação;
- a rodada começa com lastro auditável.
