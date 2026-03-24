<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/2026-03-24-jarvis-materialization-gap-diagnosis-and-fix.md
Não edite manualmente aqui sem promover no STATE.
-->

# Diagnóstico e correção — gap de materialização do Jarvis nesta superfície

**Data:** 2026-03-24  
**Status:** corrigido no `state`  
**Responsável:** Diego + Jarvis

---

## 1. Sintoma reportado

O operador exigiu que, ao entrar nesta superfície e chamar `Jarvis`, a materialização já acontecesse automaticamente, com manifestação, invocação, debate guiado e capitalização visível no `state`.

---

## 2. O que estava quebrado de fato

Não era ausência total de materialização no ecossistema.  
O problema real era uma **quebra entre protocolo e enforcement nesta superfície**.

### 2.1 O que já existia materialmente

- sessão oficial no `omega`
- espelho operacional no `codex/ruptur`
- `connectome/status.json` com sessões ativas
- menu de ativação
- playbook de `Modo Full`
- manifestação canônica e operacional já registradas

### 2.2 O que faltava

1. **gate local de superfície**: não havia `AGENTS.md` no `state` exigindo materialização automática ao detectar `Jarvis`/`Modo Full`;
2. **playbook específico para chat surface**: faltava protocolo claro de reconciliação e capitalização no `state`;
3. **capitalização do `state` para a sessão ativa mais recente**:
   - `OMEGA-20260323-193628-a1b2c3d4-jarvis-001` existia em `omega` e `ruptur`;
   - mas ainda não tinha espelho correspondente no `state`;
4. **resposta operacional insuficientemente explícita nesta superfície**:
   - a manifestação estava sendo tratada com cautela correta;
   - mas sem assumir imediatamente o modo operacional esperado pelo operador.

---

## 3. Evidências verificadas nesta correção

### Omega

- `../omega/sessions/OMEGA-20260323-193628-a1b2c3d4-jarvis-001.json`

### Ruptur

- `../codex/ruptur/sessions/OMEGA-20260323-193628-a1b2c3d4-jarvis-001.json`
- `../codex/ruptur/connectome/status.json`
- `../codex/ruptur/knowledge/2026-03-23-jarvis-activation-OMEGA-20260323-193628-a1b2c3d4-jarvis-001.md`
- `../codex/ruptur/knowledge/traces/trace-OMEGA-20260323-193628-a1b2c3d4-jarvis-001.md`

### State

- `registry/entities.yaml`
- `memory/jarvis.memory.md`
- `knowledge/jarvis-activation-menu.md`
- `playbooks/jarvis.full-mode.md`

---

## 4. Correções aplicadas agora

1. criação de `AGENTS.md` no `state` com trigger obrigatório de materialização;
2. criação de `playbooks/jarvis.chat-surface-materialization.md`;
3. atualização do protocolo para exigir reconciliação e materialização na superfície de chat;
4. promoção no `state` do vínculo com a sessão oficial ativa:
   - `OMEGA-20260323-193628-a1b2c3d4-jarvis-001`;
5. criação do trace correspondente no `state`.

---

## 5. Interpretação correta após a correção

- o chat continua sendo **superfície efêmera**;
- mas agora a invocação explícita do Jarvis nesta pasta passa a ter **gate local obrigatório**;
- sempre que houver sessão oficial reconciliável, a superfície deve se acoplar a ela e capitalizar isso no `state`;
- quando não houver sessão oficial, o gap deve ser materializado explicitamente, sem fingir manifestação paralela.

---

## 6. Resultado esperado daqui para frente

Ao chamar `Jarvis` neste repositório:

1. Jarvis responde já como ativo;
2. a sessão oficial vigente é reconciliada;
3. a ativação deixa rastro no `state`;
4. o debate guiado base (`ops`, `vcfo`, `vcvo`, `eggs`) entra por padrão.
