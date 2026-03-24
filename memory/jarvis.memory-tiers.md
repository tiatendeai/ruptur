<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/memory/jarvis.memory-tiers.md
Não edite manualmente aqui sem promover no STATE.
-->

<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/memory/jarvis.memory-tiers.md
Não edite manualmente aqui sem promover no STATE.
-->

# Arquitetura de Memória em Tiers — Jarvis

**Status:** ativo  
**Última revisão:** 2026-03-23  
**Responsável:** State + Ruptur

---

## 1. Objetivo

Definir onde cada tipo de memória deve viver, quem pode escrevê-la e sob qual gate ela pode ser promovida.

## 2. Tiers

### Tier 0 — Local selado / sensível

- **Dono:** Alpha local / ambiente protegido
- **Exemplos:** segredos, binds locais, overrides sensíveis
- **Escrita:** operador autorizado
- **Promoção:** nunca para Git público

### Tier 1 — Sessão viva

- **Dono:** Omega + repositório operacional
- **Exemplos:** `session_id`, `last_activity_at`, `connectome/status.json`, traces temporárias
- **Escrita:** runtime e operadores autorizados
- **Promoção:** só via gate quando virar aprendizado durável

### Tier 2 — Governança canônica

- **Dono:** State
- **Exemplos:** guardrails, decisões, memória curada, playbooks, registries
- **Escrita:** controlada por revisão humana e intake gate
- **Promoção:** somente com evidência e reconciliação

### Tier 3 — Conhecimento operacional reaproveitável

- **Dono:** repositório do domínio + State quando transversal
- **Exemplos:** runbooks, docs de governança local, guias de operação, portfolio de modelos
- **Escrita:** times e operadores do domínio
- **Promoção:** quando o conteúdo se tornar transversal ou institucional

## 3. ACL mínima por papel

| Papel | Tier 0 | Tier 1 | Tier 2 | Tier 3 |
| --- | --- | --- | --- | --- |
| Operador humano autorizado | escrever | escrever | promover com gate | escrever |
| Runtime operacional | não | escrever limitado | não | escrever local conforme domínio |
| Agente em sessão | não | sugerir / registrar trilha | não | sugerir |
| State canônico | não | ler por evidência | escrever com gate | referenciar |

## 4. Regra central

Memória de sessão **não** vira memória canônica por inércia.

Toda promoção entre tiers exige:

- origem identificada
- autoridade confirmada
- scorecard mínimo
- decisão explícita

## 5. Resultado esperado

O ecossistema passa a distinguir com clareza:

- o que é local e sensível
- o que é vivo e efêmero
- o que é governança canônica
- o que é conhecimento operacional reaproveitável
