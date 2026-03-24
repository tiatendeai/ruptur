<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/matriz-no-go-bloqueio-aborto-e-uso-ativo.md
Não edite manualmente aqui sem promover no STATE.
-->

# Matriz de no-go, bloqueio, aborto e uso ativo

**Status:** ativo  
**Data:** 2026-03-24  
**Origem:** mesa paralela A+B orquestrada pelo Maestro

---

## 1. Objetivo

Dar ao ecossistema uma linguagem operacional única para:

- dizer **o que não fazer**
- parar cedo com justificativa
- diferenciar `bloqueado` de `abortado`
- garantir que gatilhos automáticos tenham uso real e seguro

---

## 2. Saída mínima obrigatória em tarefas críticas

Toda resposta crítica deve explicitar:

1. **caminho recomendado**
2. **caminho não seguir**
3. **estado recomendado** (`seguir`, `bloqueado`, `abortado`, `reenquadrar`)
4. **evidência faltante**
5. **condição de retomada**

---

## 3. Matriz de decisão

| Situação | Estado correto | Regra |
|---|---|---|
| linha de ação parece boa, mas faltam dados recuperáveis | `bloqueado` | parar, pedir evidência, preservar trilha |
| linha de ação viola guardrail, escopo, autoridade ou segurança | `abortado` | não executar e registrar gatilho |
| linha de ação é possível, mas o enquadramento está errado | `reenquadrar` | ajustar objetivo antes de seguir |
| linha de ação é válida e reversível | `seguir` | avançar com dono, métrica e checkpoint |

---

## 4. Caminhos proibidos

Não seguir quando houver:

- corte de custo sem medir retrabalho
- otimização de prompt sem medir first-pass acceptance
- troca de modelo crítico sem eval
- automação sem owner
- recomendação sem deixar claro o que não fazer
- execução sem explicitar risco mais caro entre falso positivo e falso negativo

---

## 5. Garantia de uso ativo

Um gatilho automático só conta como ativo quando houver:

- **owner**
- **métrica**
- **trilha de uso**
- **rollback**
- **critério de desligamento**

Sem esses cinco elementos, o conteúdo segue como biblioteca passiva.

---

## 6. Scorecard mínimo

| Indicador | Uso |
|---|---|
| `% falso positivo` | medir se o sistema está fazendo o que não devia |
| `% falso negativo` | medir se o sistema está deixando valor passar |
| `retrabalho por entrega aceita` | medir custo oculto de processo ruim |
| `tempo até negativa segura` | medir maturidade para negar cedo |
| `% saídas com "não fazer" explícito` | medir aderência à matriz |
