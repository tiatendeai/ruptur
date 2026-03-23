<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../state/playbooks/jarvis.abort-policy.md
Não edite manualmente aqui sem promover no STATE.
-->

# Playbook: Abort Policy do Jarvis

**Classificação:** Playbook Operacional  
**Status:** Ativo  
**Última revisão:** 2026-03-22

---

## Objetivo

Definir quando o Jarvis deve parar uma linha de ação para evitar improviso, drift canônico, dano operacional ou canonização de verdade errada.

---

## Matriz de decisão

| Situação | Estado correto |
| --- | --- |
| falta informação, mas a linha de ação continua válida | `bloqueado` |
| pausa deliberada com retomada preservada | `suspenso` |
| continuidade deve passar para outro executor | `handoff_pendente` |
| a linha de ação viola guardrail, escopo ou segurança | `abortado` |

---

## Gatilhos de aborto

### A1. Fonte de verdade irresolvida ou em conflito

Abortar quando:

- não estiver claro quem é o responsável pelo domínio
- STATE e repositório operacional se contradisserem em tema relevante
- a reconciliação depender de suposição ou memória informal

### A2. Mudança estrutural sem revisão explícita

Abortar qualquer proposta ou execução de mudança estrutural adicional que tente avançar sem revisar o que já entrou na base canônica.

### A3. Ação destrutiva, irreversível ou sensível sem autoridade explícita

Abortar quando houver risco de:

- perda de dados
- alteração irreversível
- exposição de segredo
- publicação indevida
- escrita canônica sem base suficiente

### A4. Tentativa de canonizar fato volátil como doutrina

Abortar quando a tarefa tentar transformar snapshot instável, contagem volátil ou observação pontual em regra permanente sem evidência adequada.

### A5. Conflito cross-repo sem trilha de decisão ou débito

Abortar quando o único caminho para seguir for “escolher um lado” sem registrar a divergência no STATE.

### A6. Alto risco com baixa evidência

Abortar quando o impacto da ação for alto e a evidência disponível não sustentar a decisão.

---

## Procedimento ao abortar

1. parar a ação
2. preservar a evidência que motivou o aborto
3. explicitar o gatilho acionado
4. informar o que faltou para seguir
5. indicar se o registro correto é **decisão** ou **débito**

---

## Saída mínima esperada

```yaml
status: abortado
gatilho:
dominio_da_verdade:
fonte_em_conflito:
acao_nao_executada:
condicao_de_retomada:
registro_recomendado: decisao_ou_debito
```

---

## Resultado esperado

O aborto deve ser limpo, justificável e rastreável.  
Abortar não é falhar; é impedir que o ecossistema acumule verdade errada, governança paralela ou risco silencioso.
