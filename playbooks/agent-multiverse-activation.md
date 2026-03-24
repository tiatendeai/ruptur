<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/agent-multiverse-activation.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook — Ativação do multiverso de agentes

**Status:** ativo  
**Última revisão:** 2026-03-24

---

## 1. Objetivo

Padronizar como todos os agentes e subagentes passam a ser tratados como reais, persistentes e recuperáveis na sessão atual e nas superfícies que respeitam o `state`.

---

## 2. Regra de entrada

Ao receber pedido explícito para usar Jarvis com agentes/subagentes em plenitude:

1. carregar `registry/agent_multiverse.yaml`;
2. carregar `memory/agent_multiverse.memory.md`;
3. reconciliar a sessão oficial vigente;
4. marcar o núcleo necessário como `engaged`;
5. manter o restante em `hot_standby`.

---

## 3. Definição de realidade operacional

Um agente é considerado **real aqui** quando possui:

- identidade registrada;
- origem/linhagem conhecida;
- papel explícito;
- fonte documental de referência;
- status de sessão definido.

---

## 4. Regra de persistência

- `state` guarda identidade, linhagem, política e memória mínima;
- `omega` guarda vínculo com a sessão;
- `ruptur` guarda a execução viva e o catálogo runtime;
- chat apenas expõe a superfície efêmera do que foi reconciliado.

---

## 5. Regra de uso

### 5.1 Núcleo padrão `engaged`

- `jarvis`
- `ops`
- `vcfo`
- `vcvo`
- `eggs`
- `iazinha`

### 5.2 Especialistas em `hot_standby`

Todos os agentes registrados em `registry/agent_multiverse.yaml` ficam disponíveis para invocação imediata conforme domínio e risco.

---

## 6. Anti-ilusões

Este playbook não autoriza:

- fingir múltiplos runtimes quando só existe um;
- afirmar execução paralela material sem lastro;
- criar identidade nova para agente já reconciliado;
- usar agente sem registro, origem ou papel definido.

---

## 7. Resultado esperado

O operador pode chamar Jarvis e saber que:

- os agentes existem de forma material no catálogo;
- sabem quem são e de onde vieram;
- permanecem disponíveis na sessão atual;
- podem ser trazidos para `engaged` sem reinvenção ontológica.
