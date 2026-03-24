<!--
Espelho local gerado por scripts/jarvis/sync_state_duality.py.
Fonte canônica: ../../state/playbooks/governanca/processos/template-registro-correcao.md
Não edite manualmente aqui sem promover no STATE.
-->

# Template — Registro de Correcao

Use este arquivo como base para cada correcao.

## Cabecalho

- `id`: RUP-YYYY-NNN
- `data`: YYYY-MM-DD
- `sistema`: farm | ruptur | adk | vps-oracle | outro
- `times_impactados`: backend | frontend | devops | produto | seguranca | dados
- `owner_tecnico`: nome
- `owner_economico`: nome
- `status`: draft | em_validacao | concluido | rollback

## 1) Contexto

Descreva o sintoma e como foi detectado.

## 2) Causa raiz

Descreva a causa raiz confirmada.  
Se ainda for hipotese, marcar explicitamente.

## 3) Correcao aplicada

Liste o que mudou e onde mudou (arquivos, endpoints, jobs, fluxos).

## 4) Comentarios tecnicos relevantes

Liste os pontos que receberam comentarios no codigo com o ID `RUP-YYYY-NNN`.

## 5) Validacao

- testes executados
- evidencias (logs, prints, payloads, respostas)
- resultado esperado x resultado observado

## 6) Impacto lateralizado

Descreva impacto para outros times e dependencias cruzadas.

## 7) Risco residual

Descreva riscos que permanecem apos a correcao.

## 8) Rollback

Descreva como reverter, com pre-condicoes e sinais de gatilho.

## 9) Links

- card GitHub Project:
- PR/commit:
- runbook/doc atualizada:
