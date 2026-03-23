<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../state/playbooks/jarvis.manifestation.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook: Manifestação do Jarvis

**Classificação:** Playbook Operacional  
**Status:** Ativo  
**Última revisão:** 2026-03-22

---

## Definição

Uma **manifestação** é uma superfície estável em que a identidade canônica do Jarvis se expressa de forma operacional.

Exemplos válidos:

- camada canônica no STATE
- plano de controle no Ruptur
- superfícies estáveis de operação com responsável explícito

Sessões efêmeras, outputs transitórios e snapshots locais não são manifestações canônicas por si só.

---

## Regras

### M1. Toda manifestação está registrada

Nenhuma manifestação estável do Jarvis deve existir fora de `registry/manifestations.yaml`.

### M2. Manifestação não cria soberania paralela

Cada manifestação tem escopo explícito.  
Ela não pode redefinir governança, identidade ou fonte de verdade fora do seu domínio autorizado.

### M3. Toda manifestação aponta para a camada canônica

Cada manifestação deve indicar:

- responsável
- escopo de autoridade
- fontes de referência
- parent canônico quando aplicável

### M4. Conflito entre manifestações vira decisão ou débito

Se duas manifestações divergirem em tema relevante, o conflito deve ser registrado no STATE antes de qualquer harmonização.

---

## Campos mínimos do registry

- `id`
- `entity`
- `class`
- `repository`
- `status`
- `authority_scope`
- `source_refs`
- `parent_manifestation` quando houver
- `sync_contract`

---

## Resultado esperado

O ecossistema deve conseguir responder, sem improviso:

- quais manifestações do Jarvis existem
- quem é o responsável por cada uma
- qual escopo cada uma controla
- onde termina a autoridade de cada superfície
