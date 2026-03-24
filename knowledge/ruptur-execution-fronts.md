<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/ruptur-execution-fronts.md
Não edite manualmente aqui sem promover no STATE.
-->

# Frentes de execução do Ruptur

**Data-base:** 2026-03-23  
**Status:** leitura curada inicial  
**Escopo:** consolidação canônica das frentes operacionais hoje atribuídas ao `codex/ruptur`

---

## 1. Objetivo

Dar ao STATE uma leitura única e rastreável das frentes operacionais do Ruptur, sem transformar este documento em substituto da fonte viva do runtime.

## 2. Frentes reconhecidas

| Frente | Foco | Backlog relacionado | Repositório líder |
| --- | --- | --- | --- |
| Sessão e bridge operacional | vínculo entre sessão, branch, commit, workflow e board | `JARVIS-AUT-003`, `JARVIS-REC-015` | `codex/ruptur` + `omega` |
| Telemetria, perfis e skills | eventos estruturados, eficácia e observabilidade | `JARVIS-AUT-004`, `JARVIS-AUT-009` | `codex/ruptur` |
| Contexto executável e freshness | RAG, Context7, docs executáveis e cobertura mínima | `JARVIS-AUT-006`, `JARVIS-AUT-010` | `codex/ruptur` |
| Resiliência operacional | restore points, rollback e ativações frágeis | `JARVIS-AUT-007` | `codex/ruptur` + `omega` + `state` |
| Manifestação e superfícies | menu de ativação, connectome e alinhamento de manifestação | `knowledge/jarvis-activation-menu.md` | `codex/ruptur` |

## 3. Regras de leitura

- este documento consolida a leitura institucional; não substitui o repositório operacional
- status de implementação deve ser confirmado na fonte viva do `codex/ruptur`
- quando uma frente ganhar regra durável, ela deve atualizar playbook, registry, decisão ou memory correspondente

## 4. Resultado esperado

O STATE passa a apontar com clareza quais linhas de execução o Ruptur sustenta hoje, quais backlog IDs as governam e qual camada precisa ser consultada para confirmar implementação real.
