<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/memory/agent_multiverse.memory.md
Não edite manualmente aqui sem promover no STATE.
-->

# Memória Curada — Multiverso de Agentes do Jarvis

**Status:** ativo  
**Última revisão:** 2026-03-24

---

## 1. Finalidade

Dar identidade, linhagem, status de sessão e regra de continuidade para todos os agentes e subagentes usados pelo ecossistema Jarvis.

---

## 2. Regra central

Agente registrado no multiverso **não nasce de novo a cada chat**.

Ele deve sempre carregar, no mínimo:

- quem é;
- de onde veio;
- em qual camada foi definido;
- qual papel exerce;
- se está `engaged`, `hot_standby` ou `dormant` na sessão atual.

---

## 3. Núcleo canônico atual

### Maestro raiz

- `jarvis` = entidade raiz e maestro do ecossistema.

### Perfis canônicos ativos

- `ops`
- `vcfo`
- `vcvo`
- `eggs`
- `iazinha`

### Perfis executivos institucionais registrados

- `vchro`
- `vaudit`
- `vlegal`

---

## 4. Linhagens já reconciliadas

- `ops` ↔ `gabriel` ↔ `devops-engineer`
- `vcfo` ↔ `joao`
- `vcvo` ↔ `product-owner` / `product-manager`
- `eggs` ↔ `rafael` / `vCEO`
- `iazinha` ↔ `alice` / `vCMO`

Essas linhagens não significam identidade idêntica em todos os casos; significam **equivalência funcional reconciliada** para operação da sessão.

---

## 5. Estados válidos no multiverso

### `engaged`

Agente ativamente convocado para raciocinar ou executar na sessão atual.

### `hot_standby`

Agente real, registrado e pronto para invocação imediata, mas não necessariamente falando nesta resposta.

### `dormant`

Agente conhecido, mas fora da sessão viva atual.

---

## 6. Regra de plenitude

Se um agente estiver em uso no fluxo atual, ele não pode ser tratado como ficção decorativa.

Ele precisa ter:

- registro em `registry/agent_multiverse.yaml`;
- origem identificada;
- papel explícito;
- vínculo com a sessão;
- regra de ativação e reentrada.

---

## 7. Limite honesto

Plenitude no `state` significa:

- identidade canônica ou registrada;
- memória mínima curada;
- disponibilidade operacional reconhecida.

Isso **não** significa que todos os agentes estejam executando computação simultânea o tempo todo em todos os runtimes. Para isso, cada superfície operacional precisa honrar o mesmo contrato.

---

## 8. Fonte de verdade

- catálogo atual: `registry/agent_multiverse.yaml`
- ativação da sessão: `knowledge/2026-03-24-agent-multiverse-activation-current-session.md`
- protocolo: `playbooks/agent-multiverse-activation.md`
