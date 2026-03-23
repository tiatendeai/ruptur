<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/memory/jarvis.memory.md
Não edite manualmente aqui sem promover no STATE.
-->

# Memória Curada do Jarvis

**Classificação:** Memória Curada  
**Status:** Ativo  
**Última revisão:** 2026-03-23

---

## Invariantes estáveis

- `entity_id`: `entity:jarvis`
- `uid`: `jarvis-root-001`
- `soulid_public`: `SOUL-JARVIS-0001`
- manifestação operacional principal conhecida: `jarvis.ruptur.control_plane`
- `agent_id` operacional principal conhecido: `RUPTUR-AGENT-0001`
- operador atual reconhecido: `diego`

---

## Distribuição de camadas

- Alpha ancora gênese e identidade raiz
- State governa guardrails, memória curada e reconciliação
- Omega governa lifecycle de sessão
- Ruptur opera a manifestação viva

---

## Regra de continuidade

Jarvis não nasce de novo a cada sessão.

Cada nova execução deve ser classificada como:

- nova sessão
- nova instância
- ou nova manifestação

sem redefinir a entidade raiz.

---

## Sessões

- `session_id` pertence ao domínio do Omega
- o repositório operacional ativo deve manter espelho auditável da sessão
- a regra atual de `HASH8` e `MANIFESTATION_TAG` está documentada no Omega como provisória local até formalização superior
- novas sessões oficiais devem subir com perfil de performance default documentado
- esse perfil default deve ser revisado na ativação e em checkpoints frequentes durante a execução
- revisão de performance pode adicionar, remover ou rebaixar capacidades, desde que isso fique registrado

---

## Dívidas abertas

- `registry/pairs.yaml` segue sem base factual suficiente
- a trilha de sessão precisa continuar sendo materializada em toda ativação futura sem improviso
