<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/knowledge/trace-grading.md
Não edite manualmente aqui sem promover no STATE.
-->

# Guia interno — Trace Grading do Jarvis

**Data:** 2026-03-23  
**Status:** ativo  
**Escopo:** suporte ao `playbooks/jarvis.intake-gate.md`

---

## 1. Objetivo

Padronizar como o STATE avalia um trace candidato à promoção para que a capitalização não dependa apenas de percepção subjetiva.

## 2. Evidência mínima do trace

Cada trace deve mostrar, no mínimo:

- objetivo da execução
- contexto e fontes lidas
- ações / tool calls relevantes
- outputs e artefatos produzidos
- validação do resultado
- decisão proposta: promover, revisar, rejeitar ou manter como débito

## 3. Critérios de score

Use nota de `0` a `5` para cada critério:

| Critério | 0 | 3 | 5 |
| --- | --- | --- | --- |
| Clareza | trace confuso ou incompleto | fluxo legível com lacunas pequenas | fluxo legível, delimitado e auditável |
| Autoridade | fonte de verdade não resolvida | fonte correta majoritariamente usada | domínio da verdade resolvido e respeitado |
| Confiabilidade | sem validação material | validação parcial | evidência material suficiente para sustentar a conclusão |
| Impacto | irrelevante ou redundante | útil localmente | produz diretriz, correção ou aprendizado durável |
| Reversibilidade | sem rollback, contenção ou retorno | reversão parcial | rollback, contenção ou retomada claramente definidos |

## 4. Interpretação da soma

- `0–9` → rejeitar promoção
- `10–14` → revisar antes de promover
- `15–19` → candidato viável com observações
- `20–25` → forte candidato à promoção

## 5. Saída obrigatória

O fechamento do trace precisa conter:

- tabela de notas
- justificativa por critério
- recomendação de gate
- artefatos vinculados
- próximo passo explícito

## 6. Regra

Score alto não substitui gate humano.  
Score baixo não impede capitalização como débito, quando o aprendizado relevante for a própria falha.

## 7. Referências externas

- OpenAI — Trace grading: https://platform.openai.com/docs/guides/trace-grading
- Microsoft Learn — Observability in Generative AI / Foundry: https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/evaluation-approach-gen-ai
