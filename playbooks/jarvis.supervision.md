<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.supervision.md
Não edite manualmente aqui sem promover no STATE.
-->

<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/jarvis.supervision.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook — supervisão do Jarvis

**Status:** ativo  
**Última revisão:** 2026-03-23

---

## Cadeia de supervisão

- Alpha supervisiona coerência de gênese e identidade raiz
- State supervisiona guardrails, memória curada e reconciliação
- Omega supervisiona lifecycle de sessão
- repositório operacional supervisiona runtime, execução e connectome vivo

---

## Regra de escalonamento

- conflito de identidade → Alpha + State
- conflito de manifestação → State
- conflito de sessão → Omega
- conflito de execução local → repositório operacional + State se estrutural

---

## Supervisão de performance

O perfil de performance de uma sessão do Jarvis deve ser supervisionado em dois níveis:

### 1. Nível operacional

- o repositório operacional ativo decide o que realmente sobe na sessão viva
- o `omega` garante que a sessão registre a revisão e o impacto no lifecycle

### 2. Nível institucional

- o `state` define quais capacidades podem entrar como default
- o `state` registra débitos, remoções estruturais e mudanças de política

---

## Regra

Capacidade de performance:

- **não** pode ser promovida a default só porque foi útil uma vez
- **não** deve continuar ativa se o contexto mostrar que ela piora ruído, custo ou risco
- deve ser revisada frequentemente durante a execução real
