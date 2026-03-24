# Mesa paralela A+B — runtime, taxonomia e enforcement no Ruptur

**Data:** 2026-03-24  
**Status:** ativo  
**Fonte canônica:** `../../state/knowledge/2026-03-24-mesa-paralela-a-b-vcontroller-adminops-finops.md`

---

## 1. Frentes executadas em paralelo

### Frente A — Estrutura e taxonomia

- formalização de `vController`, `vAdminOps` e `vFinOps`
- atualização de taxonomia, gatilhos e backlog

### Frente B — Runtime e enforcement

- auto-injeção de contexto de governança
- novas rotas para os perfis
- saídas mínimas obrigatórias para temas críticos

---

## 2. Mudanças operacionais refletidas no backend

- rotas novas:
  - `POST /jarvis/ask/vcontroller`
  - `POST /jarvis/ask/vadminops`
  - `POST /jarvis/ask/vfinops`
- auto-injeção de guardrails para temas de:
  - no-go / risco / bloqueio / aborto
  - lean / hipótese / experimento
  - controle financeiro
  - administrativo / handoff / SOP
  - FinOps / custo de IA e cloud

---

## 3. Saída mínima esperada

Para perfis críticos, o runtime passa a empurrar a estrutura:

1. caminho recomendado
2. caminho não seguir
3. estado recomendado
4. evidência faltante
5. condição de retomada
