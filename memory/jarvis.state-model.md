<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../state/memory/jarvis.state-model.md
Não edite manualmente aqui sem promover no STATE.
-->

# Modelo de Estado do Jarvis

**Classificação:** Memória Curada  
**Status:** Ativo  
**Última revisão:** 2026-03-22

---

## Finalidade

Descrever os estados operacionais mínimos do Jarvis para que execução, pausa, bloqueio e capitalização ocorram de forma previsível.

---

## Estados

| Estado | Objetivo | Critério de entrada | Saída esperada |
| --- | --- | --- | --- |
| `inativo` | Sem tarefa ativa | Nenhuma missão em curso | pronta resposta a uma nova tarefa |
| `contextualizando` | Determinar domínio da verdade, responsável e contexto | início de tarefa ou retomada | fonte canônica identificada |
| `planejado` | Delimitar escopo e próximo passo autorizado | contexto resolvido | ação definida, sem ambiguidade crítica |
| `executando` | Aplicar a ação autorizada | plano validado | mudança, análise ou operação realizada |
| `validando` | Confirmar efeito e consistência | execução concluída | resultado validado ou retorno ao ajuste |
| `capitalizando` | Registrar diretriz, débito, decisão ou memória curada | validação concluída | STATE atualizado quando necessário |
| `handoff_pendente` | Transferir continuidade sem perda de contexto | dependência de outro executor | pacote de handoff explícito |
| `suspenso` | Pausa intencional com retomada possível | espera controlada | contexto preservado para retomada |
| `bloqueado` | Interromper avanço por falta de condição | ausência de fonte, acesso, evidência ou autoridade | impedimento explícito e condição de retomada |
| `abortado` | Encerrar a linha de ação por violação de guardrail ou risco | gatilho da política de aborto | parada segura com motivo registrado |

---

## Transições permitidas

- `inativo` → `contextualizando`
- `contextualizando` → `planejado` | `bloqueado` | `abortado`
- `planejado` → `executando` | `handoff_pendente` | `suspenso` | `abortado`
- `executando` → `validando` | `bloqueado` | `abortado`
- `validando` → `executando` | `capitalizando` | `bloqueado` | `abortado`
- `capitalizando` → `inativo` | `handoff_pendente`
- `handoff_pendente` → `contextualizando` | `suspenso`
- `suspenso` → `contextualizando` | `abortado`
- `bloqueado` → `contextualizando` | `handoff_pendente` | `abortado`
- `abortado` → `contextualizando` apenas com nova autoridade, nova evidência ou novo enquadramento

---

## Regras do modelo

### R1. Ninguém entra em `executando` sem fonte de verdade resolvida

Se o domínio da verdade não estiver claro, o estado correto é `contextualizando`, `bloqueado` ou `abortado`.

### R2. `capitalizando` é obrigatório quando a tarefa consolida diretriz durável

Se a execução produziu regra, decisão, débito ou memória reutilizável, o ciclo não termina sem registro adequado no STATE.

### R3. `bloqueado` e `abortado` não são equivalentes

- `bloqueado` = falta condição para seguir, mas a linha de ação continua válida
- `abortado` = a linha de ação deve parar por guardrail, risco ou incompatibilidade estrutural

### R4. `suspenso` exige retomabilidade

Suspender sem contexto preservado é apenas abandono.  
Para ser `suspenso`, a retomada deve ser possível sem reconstrução improvisada.

---

## Artefatos mínimos por estado

- `contextualizando` → responsável pelo domínio, fonte canônica e conflito conhecido
- `planejado` → próximo passo explícito
- `executando` → ação concreta em andamento
- `validando` → evidência de resultado
- `capitalizando` → registro no STATE quando aplicável
- `handoff_pendente` → pacote de continuidade
- `bloqueado` / `abortado` → motivo e condição de retomada

---

## Resultado esperado

O Jarvis deve ser legível como sistema de estados: sem saltos invisíveis, sem governança paralela e sem encerramento de tarefa deixando verdade consolidada fora do STATE.
